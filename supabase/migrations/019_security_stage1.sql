-- Security stage 1: fail-closed helper functions and automatic restriction expiry.
-- Authorization remains enforced by RLS and server-side functions, never by UI state alone.
create or replace function public.expire_account_restrictions()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  update public.account_restrictions
     set is_active=false
   where is_active=true and ends_at is not null and ends_at<=now();
  get diagnostics n = row_count;
  update public.moderation_actions
     set status='expired'
   where status='active' and ends_at is not null and ends_at<=now();
  return n;
end $$;
revoke all on function public.expire_account_restrictions() from public, anon, authenticated;

create or replace function public.assert_not_restricted(p_scope text)
returns void language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_scope not in ('account','publish','live','comment','message','purchase','monetization','withdrawal') then
    raise exception 'invalid_restriction_scope' using errcode='22023';
  end if;
  if public.has_active_restriction(p_scope) then
    raise exception 'account_restricted' using errcode='42501';
  end if;
end $$;
revoke all on function public.assert_not_restricted(text) from public, anon;
grant execute on function public.assert_not_restricted(text) to authenticated;
