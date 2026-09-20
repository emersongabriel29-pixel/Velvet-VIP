alter table public.media_processing_jobs add column if not exists worker_token uuid;
alter table public.media_processing_jobs add column if not exists locked_until timestamptz;
alter table public.media_processing_jobs add column if not exists next_attempt_at timestamptz not null default now();
alter table public.media_processing_jobs add column if not exists archive_manifest_path text;
create index if not exists media_worker_queue_idx on public.media_processing_jobs(next_attempt_at,created_at) where status in ('queued','processing');
-- All outputs remain private. HLS playlists are archived, not exposed without a segment-signing gateway.
update storage.buckets set allowed_mime_types=array(select distinct x from unnest(coalesce(allowed_mime_types,array[]::text[])||array['video/mp2t','application/vnd.apple.mpegurl']) x) where id='velvet-media';

create or replace function public.claim_media_job() returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.media_processing_jobs%rowtype;
begin
  if current_user not in ('service_role','postgres') then raise exception 'server_only' using errcode='42501'; end if;
  with exhausted as (
    update public.media_processing_jobs set status='failed',error_message='worker_lease_expired',worker_token=null,locked_until=null,updated_at=now()
    where status='processing' and locked_until<now() and attempts>=3 returning video_id
  ) update public.videos set processing_status='failed',media_error='worker_lease_expired' where id in (select video_id from exhausted);
  select * into j from public.media_processing_jobs
    where attempts<3 and next_attempt_at<=now() and (status='queued' or (status='processing' and locked_until<now()))
    order by created_at for update skip locked limit 1;
  if not found then return null; end if;
  update public.media_processing_jobs set status='processing',worker_token=gen_random_uuid(),locked_until=now()+interval '3 minutes',attempts=attempts+1,updated_at=now()
    where id=j.id returning * into j;
  update public.videos set processing_status='processing' where id=j.video_id;
  return to_jsonb(j);
end $$;
create or replace function public.heartbeat_media_job(p_id uuid,p_token uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if current_user not in ('service_role','postgres') then raise exception 'server_only' using errcode='42501'; end if;
  update public.media_processing_jobs set locked_until=now()+interval '3 minutes',updated_at=now() where id=p_id and worker_token=p_token and status='processing' and locked_until>now();
  return found;
end $$;
create or replace function public.finish_media_job(p_id uuid,p_token uuid,p_renditions jsonb,p_archive_manifest text) returns void language plpgsql security invoker set search_path='' as $$
declare j public.media_processing_jobs%rowtype; prefix text; rendition jsonb;
begin
  if current_user not in ('service_role','postgres') then raise exception 'server_only' using errcode='42501'; end if;
  select * into j from public.media_processing_jobs where id=p_id and worker_token=p_token and status='processing' and locked_until>now() for update;
  if not found then raise exception 'lease_lost'; end if;
  prefix:=split_part(j.source_path,'/',1)||'/renditions/'||j.video_id||'/'||p_token||'/';
  if jsonb_typeof(p_renditions) is distinct from 'array' or jsonb_array_length(p_renditions)<1 then raise exception 'renditions_required'; end if;
  for rendition in select value from jsonb_array_elements(p_renditions) loop
    if (rendition->>'storage_path') is null or (rendition->>'storage_path') not like prefix||'%' or (rendition->>'storage_path') like '%..%' then raise exception 'invalid_output_path'; end if;
  end loop;
  if p_archive_manifest is null or p_archive_manifest not like prefix||'%' or p_archive_manifest like '%..%' then raise exception 'invalid_manifest_path'; end if;
  update public.media_processing_jobs set status='ready',renditions=p_renditions,archive_manifest_path=p_archive_manifest,error_message=null,worker_token=null,locked_until=null,updated_at=now() where id=p_id;
  update public.videos set processing_status='ready',media_status='ready',media_error=null where id=j.video_id;
  -- Moderation approval and publication/draft state are deliberately unchanged.
end $$;
create or replace function public.fail_media_job(p_id uuid,p_token uuid,p_error text) returns boolean language plpgsql security invoker set search_path='' as $$
declare j public.media_processing_jobs%rowtype;
begin
  if current_user not in ('service_role','postgres') then raise exception 'server_only' using errcode='42501'; end if;
  update public.media_processing_jobs set status=case when attempts>=3 then 'failed' else 'queued' end,
    next_attempt_at=now()+interval '1 minute'*power(2,attempts),error_message=left(p_error,120),worker_token=null,locked_until=null,updated_at=now()
    where id=p_id and worker_token=p_token and status='processing' and locked_until>now() returning * into j;
  if not found then return false; end if;
  update public.videos set processing_status=case when j.status='failed' then 'failed' else 'queued' end,media_error=j.error_message where id=j.video_id;
  return true;
end $$;
revoke all on function public.claim_media_job(),public.heartbeat_media_job(uuid,uuid),public.finish_media_job(uuid,uuid,jsonb,text),public.fail_media_job(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_media_job(),public.heartbeat_media_job(uuid,uuid),public.finish_media_job(uuid,uuid,jsonb,text),public.fail_media_job(uuid,uuid,text) to service_role;

create or replace function public.get_operation_diagnostics() returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 return jsonb_build_object('checked_at',now(),'checks',jsonb_build_array(
  jsonb_build_object('name','Vídeos aguardando processamento','count',(select count(*) from public.media_processing_jobs where status='queued')),
  jsonb_build_object('name','Processamento interrompido','count',(select count(*) from public.media_processing_jobs where status='processing' and locked_until<now())),
  jsonb_build_object('name','Vídeos com falha','count',(select count(*) from public.media_processing_jobs where status='failed')),
  jsonb_build_object('name','Pagamentos sem conclusão há mais de 24h','count',(select count(*) from public.checkout_sessions where status in ('created','pending') and created_at<now()-interval '24 hours')),
  jsonb_build_object('name','Eventos financeiros não processados há mais de 15min','count',(select count(*) from public.payment_events where status in ('received','failed') and created_at<now()-interval '15 minutes')),
  jsonb_build_object('name','Denúncias urgentes pendentes','count',(select count(*) from public.safety_reports where priority='urgent' and status in ('pending','reviewing')))
 ));
end $$;
revoke all on function public.get_operation_diagnostics() from public,anon;
grant execute on function public.get_operation_diagnostics() to authenticated;
