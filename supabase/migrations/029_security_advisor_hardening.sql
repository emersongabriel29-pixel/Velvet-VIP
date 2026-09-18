-- Production hardening 029: Supabase Security Advisor remediation.
alter view public.public_profiles set (security_invoker = true);

alter function public.touch_updated_at() set search_path = public, pg_temp;
alter function public.assign_safety_priority() set search_path = public, pg_temp;
alter function public.enforce_video_moderation() set search_path = public, pg_temp;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_creator_financial_fields() from public, anon, authenticated;
revoke all on function public.protect_profile_fields() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_age_verified() from public, anon;
grant execute on function public.is_age_verified() to authenticated;
revoke all on function public.is_creator_owner(uuid) from public, anon;
grant execute on function public.is_creator_owner(uuid) to authenticated;
revoke all on function public.has_active_restriction(text) from public, anon;
grant execute on function public.has_active_restriction(text) to authenticated;

revoke all on function public.assert_not_restricted(text) from public, anon, authenticated;

revoke all on function public.assert_admin() from public, anon;
grant execute on function public.assert_admin() to authenticated;
revoke all on function public.log_admin_security_event(text,text,text,jsonb) from public, anon;
grant execute on function public.log_admin_security_event(text,text,text,jsonb) to authenticated;

comment on table public.api_rate_limits is 'Server-only rate-limit state. RLS intentionally has no client policies.';
comment on table public.webhook_events is 'Server-only webhook idempotency ledger. RLS intentionally has no client policies.';

drop policy if exists "user inserts own video views" on public.video_views;
create policy "user inserts own video views" on public.video_views for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "user reads own video views" on public.video_views;
create policy "user reads own video views" on public.video_views for select to authenticated using (user_id = auth.uid() or public.is_admin());
