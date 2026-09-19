-- Move privileged RLS helpers behind a non-exposed schema while keeping safe public wrappers.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
create or replace function private.is_age_verified()
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(
    select 1 from public.profiles
    where id=auth.uid() and age_verified=true
      and birth_date <= (current_date - interval '18 years')::date
      and coalesce(is_blocked,false)=false and coalesce(is_suspended,false)=false
  );
$$;
create or replace function private.is_creator_owner(p_creator_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(select 1 from public.creators where id=p_creator_id and user_id=auth.uid());
$$;
create or replace function private.has_active_restriction(p_scope text)
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(
    select 1 from public.account_restrictions r
    where r.subject_user_id=auth.uid()
      and r.scope in(p_scope,'account') and r.is_active=true
      and r.starts_at<=now() and (r.ends_at is null or r.ends_at>now())
  );
$$;
create or replace function private.assert_admin()
returns void language plpgsql stable security definer set search_path=public,private as $$
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if private.has_active_restriction('account') then raise exception 'admin_account_restricted' using errcode='42501'; end if;
end $$;
create or replace function private.log_admin_security_event(p_action text,p_target_type text default null,p_target_id text default null,p_metadata jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path=public,private as $$
declare eid bigint;
begin
  perform private.assert_admin();
  insert into public.admin_security_events(admin_id,action,target_type,target_id,metadata)
  values(auth.uid(),left(p_action,100),left(p_target_type,100),left(p_target_id,200),coalesce(p_metadata,'{}'::jsonb))
  returning id into eid;
  return eid;
end $$;

revoke all on all functions in schema private from public;
grant execute on function private.is_admin() to anon,authenticated,service_role;
grant execute on function private.is_age_verified() to anon,authenticated,service_role;
grant execute on function private.is_creator_owner(uuid) to anon,authenticated,service_role;
grant execute on function private.has_active_restriction(text) to anon,authenticated,service_role;
grant execute on function private.assert_admin() to authenticated,service_role;
grant execute on function private.log_admin_security_event(text,text,text,jsonb) to authenticated,service_role;

create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path=public,private as $$select private.is_admin()$$;
create or replace function public.is_age_verified()
returns boolean language sql stable security invoker set search_path=public,private as $$select private.is_age_verified()$$;
create or replace function public.is_creator_owner(p_creator_id uuid)
returns boolean language sql stable security invoker set search_path=public,private as $$select private.is_creator_owner(p_creator_id)$$;
create or replace function public.has_active_restriction(p_scope text)
returns boolean language sql stable security invoker set search_path=public,private as $$select private.has_active_restriction(p_scope)$$;
create or replace function public.assert_admin()
returns void language plpgsql stable security invoker set search_path=public,private as $$begin perform private.assert_admin(); end$$;
create or replace function public.log_admin_security_event(p_action text,p_target_type text default null,p_target_id text default null,p_metadata jsonb default '{}'::jsonb)
returns bigint language sql security invoker set search_path=public,private as $$select private.log_admin_security_event(p_action,p_target_type,p_target_id,p_metadata)$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_age_verified() from public;
revoke all on function public.is_creator_owner(uuid) from public;
revoke all on function public.has_active_restriction(text) from public;
revoke all on function public.assert_admin() from public;
revoke all on function public.log_admin_security_event(text,text,text,jsonb) from public;
grant execute on function public.is_admin() to anon,authenticated,service_role;
grant execute on function public.is_age_verified() to anon,authenticated,service_role;
grant execute on function public.is_creator_owner(uuid) to anon,authenticated,service_role;
grant execute on function public.has_active_restriction(text) to anon,authenticated,service_role;
grant execute on function public.assert_admin() to authenticated,service_role;
grant execute on function public.log_admin_security_event(text,text,text,jsonb) to authenticated,service_role;
