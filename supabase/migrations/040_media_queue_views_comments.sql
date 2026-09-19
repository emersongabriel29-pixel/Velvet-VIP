-- Production readiness: media queue, view accounting and comment visibility.
drop policy if exists "Comentários públicos para leitura" on public.comments;
create policy "Comentários moderados para leitura" on public.comments
for select to public
using (
  moderation_status='approved'
  or user_id=auth.uid()
  or public.is_admin()
);

create or replace function public.initialize_video_system_fields()
returns trigger language plpgsql security definer set search_path=public,private as $$
declare v_uid uuid:=auth.uid(); v_path text;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    new.views_count := 0; new.likes_count := 0; new.comments_count := 0; new.favorites_count := 0;
    new.is_removed := false;
    new.moderation_status := 'pending';
    new.moderation_notes := null; new.moderation_score := null;
    new.ai_moderation_label := null; new.ai_moderation_confidence := null; new.moderation_review_reason := null;
    new.hls_manifest_path := null; new.hls_storage_path := null; new.media_error := null;
    new.watermark_enabled := true;
    if new.video_url like 'storage://%' then
      v_path:=substr(new.video_url,11);
      if v_uid is null or v_path not like v_uid::text||'/videos/%' or v_path like '%..%' then
        raise exception 'invalid_video_storage_path';
      end if;
      new.source_storage_path:=v_path;
    else
      new.source_storage_path:=null;
    end if;
  end if;
  return new;
end $$;

create or replace function private.enqueue_media_processing(p_video_id uuid,p_source_path text)
returns uuid language plpgsql security definer set search_path=public,private as $$
declare v_uid uuid:=auth.uid(); v_job uuid; v_video record;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select v.id,v.content_kind,v.source_storage_path,c.user_id,c.is_approved
    into v_video
  from public.videos v join public.creators c on c.id=v.creator_id
  where v.id=p_video_id;
  if not found or v_video.user_id<>v_uid or not v_video.is_approved then raise exception 'creator_not_allowed'; end if;
  if v_video.content_kind<>'long' then raise exception 'long_video_required'; end if;
  if p_source_path is null or p_source_path<>v_video.source_storage_path or p_source_path not like v_uid::text||'/videos/%' or p_source_path like '%..%' then
    raise exception 'invalid_source_path';
  end if;
  select id into v_job from public.media_processing_jobs
   where video_id=p_video_id and status in ('queued','processing')
   order by created_at desc limit 1;
  if v_job is not null then return v_job; end if;
  insert into public.media_processing_jobs(video_id,status,source_path)
  values(p_video_id,'queued',p_source_path) returning id into v_job;
  update public.videos set processing_status='queued' where id=p_video_id;
  return v_job;
end $$;
revoke all on function private.enqueue_media_processing(uuid,text) from public;
grant execute on function private.enqueue_media_processing(uuid,text) to authenticated,service_role;

create or replace function public.enqueue_media_processing(p_video_id uuid,p_source_path text)
returns uuid language sql security invoker set search_path=public,private
as $$select private.enqueue_media_processing(p_video_id,p_source_path)$$;
revoke all on function public.enqueue_media_processing(uuid,text) from public,anon;
grant execute on function public.enqueue_media_processing(uuid,text) to authenticated;

create or replace function private.record_video_view(p_video_id uuid,p_duration_seconds integer default 0)
returns boolean language plpgsql security definer set search_path=public,private as $$
declare v_uid uuid:=auth.uid(); v_creator uuid; v_recent boolean;
begin
  if v_uid is null then return false; end if;
  select creator_id into v_creator from public.videos
   where id=p_video_id and is_removed=false and is_draft=false;
  if v_creator is null then return false; end if;
  select exists(
    select 1 from public.video_views
    where video_id=p_video_id and user_id=v_uid and created_at>now()-interval '6 hours'
  ) into v_recent;
  if v_recent then return false; end if;
  insert into public.video_views(video_id,user_id,viewed_duration_seconds)
  values(p_video_id,v_uid,greatest(0,least(coalesce(p_duration_seconds,0),86400)));
  update public.videos set views_count=coalesce(views_count,0)+1 where id=p_video_id;
  update public.creators set total_views=coalesce(total_views,0)+1 where id=v_creator;
  return true;
end $$;
revoke all on function private.record_video_view(uuid,integer) from public;
grant execute on function private.record_video_view(uuid,integer) to authenticated,service_role;

create or replace function public.record_video_view(p_video_id uuid,p_duration_seconds integer default 0)
returns boolean language sql security invoker set search_path=public,private
as $$select private.record_video_view(p_video_id,p_duration_seconds)$$;
revoke all on function public.record_video_view(uuid,integer) from public,anon;
grant execute on function public.record_video_view(uuid,integer) to authenticated;
