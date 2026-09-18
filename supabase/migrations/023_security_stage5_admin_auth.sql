-- Security stage 5: administrative authorization and session-sensitive controls.
create table if not exists public.admin_security_events(
 id bigint generated always as identity primary key,
 admin_id uuid not null references public.profiles(id),
 action text not null,
 target_type text,
 target_id text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.admin_security_events enable row level security;
create policy "admins read security events" on public.admin_security_events for select to authenticated using(public.is_admin());

create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 if exists(select 1 from public.account_restrictions r where r.subject_user_id=auth.uid() and r.is_active and r.scope='account' and r.starts_at<=now() and (r.ends_at is null or r.ends_at>now()))
 then raise exception 'admin_account_restricted' using errcode='42501'; end if;
end $$;
revoke all on function public.assert_admin() from public,anon;
grant execute on function public.assert_admin() to authenticated;

create or replace function public.log_admin_security_event(p_action text,p_target_type text default null,p_target_id text default null,p_metadata jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path=public as $$
declare eid bigint;
begin
 perform public.assert_admin();
 insert into public.admin_security_events(admin_id,action,target_type,target_id,metadata)
 values(auth.uid(),left(p_action,100),left(p_target_type,100),left(p_target_id,200),coalesce(p_metadata,'{}'::jsonb)) returning id into eid;
 return eid;
end $$;
revoke all on function public.log_admin_security_event(text,text,text,jsonb) from public,anon;
grant execute on function public.log_admin_security_event(text,text,text,jsonb) to authenticated;
