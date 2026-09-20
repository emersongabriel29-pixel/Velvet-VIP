begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); seller uuid:=gen_random_uuid(); creator uuid; video uuid; j uuid;
begin
 insert into auth.users(id,email,raw_user_meta_data) values
 (a,'qa-'||a||'@example.invalid',jsonb_build_object('username','qa_'||replace(a::text,'-',''),'birth_date','1990-01-01','requested_role','admin')),
 (b,'qa-'||b||'@example.invalid',jsonb_build_object('username','qa_'||replace(b::text,'-',''),'birth_date','1990-01-01')),
 (seller,'qa-'||seller||'@example.invalid',jsonb_build_object('username','qa_'||replace(seller::text,'-',''),'birth_date','1990-01-01','requested_role','creator'));
 if (select role from public.profiles where id=a)<>'user' then raise exception 'signup_role_escalation'; end if;
 if (select age_verified from public.profiles where id=a) then raise exception 'unverified_age_accepted'; end if;
 select id into creator from public.creators where user_id=seller;
 if (select is_approved from public.creators where id=creator) then raise exception 'creator_auto_approved'; end if;
 update public.creators set is_approved=true where id=creator;
 insert into public.videos(creator_id,title,video_url,thumbnail_url,source_storage_path,content_kind,processing_status,moderation_status)
 values(creator,'QA media','storage://'||seller||'/videos/qa.mp4','',seller||'/videos/qa.mp4','long','queued','pending') returning id into video;
 insert into public.media_processing_jobs(video_id,source_path,created_at) values(video,seller||'/videos/qa.mp4','1900-01-01') returning id into j;
 perform set_config('test.a',a::text,true);perform set_config('test.b',b::text,true);perform set_config('test.video',video::text,true);perform set_config('test.job',j::text,true);
 insert into public.notifications(user_id,type,title,message) values(a,'system','QA','Fixture A'),(b,'system','QA','Fixture B');
end $$;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('test.a'))::text,true);
set local role authenticated;
do $$
declare a uuid:=current_setting('test.a')::uuid; b uuid:=current_setting('test.b')::uuid; n integer; denied boolean:=false;
begin
 if exists(select 1 from public.profiles where id=b) then raise exception 'other_profile_visible'; end if;
 update public.profiles set role='admin',age_verified=true,wallet_balance=99999 where id=a;
 if exists(select 1 from public.profiles where id=a and (role<>'user' or age_verified or wallet_balance<>0)) then raise exception 'privileged_fields_writable'; end if;
 update public.notifications set read=true where user_id=a and title='QA';
 get diagnostics n=row_count;if n<>1 then raise exception 'own_notification_not_updated'; end if;
 update public.notifications set read=true where user_id=b and title='QA';
 get diagnostics n=row_count;if n<>0 then raise exception 'other_notification_updated'; end if;
 insert into public.safety_reports(reporter_id,target_type,target_id,reason) values(a,'video',current_setting('test.video')::uuid,'underage_suspicion');
 if not exists(select 1 from public.safety_reports where reporter_id=a and priority='urgent' and status='pending') then raise exception 'report_not_prioritized'; end if;
 begin perform public.claim_media_job();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'client_claimed_worker_job'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare job jsonb; token uuid; job_id uuid:=current_setting('test.job')::uuid; prefix text; rejected boolean:=false;
begin
 job:=public.claim_media_job();if (job->>'id')::uuid<>job_id then raise exception 'wrong_fixture_claimed';end if;
 token:=(job->>'worker_token')::uuid;
 if public.heartbeat_media_job(job_id,gen_random_uuid()) then raise exception 'stale_worker_heartbeat';end if;
 if not public.heartbeat_media_job(job_id,token) then raise exception 'lease_not_renewed';end if;
 begin perform public.finish_media_job(job_id,gen_random_uuid(),'[]',null);exception when others then rejected:=true;end;
 if not rejected then raise exception 'stale_worker_finished';end if;
 prefix:=split_part(job->>'source_path','/',1)||'/renditions/'||(job->>'video_id')||'/'||token||'/';
 perform public.finish_media_job(job_id,token,jsonb_build_array(jsonb_build_object('label','360p','storage_path',prefix||'360/video.mp4')),prefix||'master.m3u8');
 if (select processing_status from public.videos where id=current_setting('test.video')::uuid)<>'ready' then raise exception 'media_not_ready';end if;
 if (select moderation_status from public.videos where id=current_setting('test.video')::uuid)<>'pending' then raise exception 'worker_bypassed_moderation';end if;
end $$;
select 'PASS: signup role, age provenance, creator approval, cross-user RLS, privileged fields, notifications, urgent reports, worker leases, moderation preservation' as result;
rollback;
