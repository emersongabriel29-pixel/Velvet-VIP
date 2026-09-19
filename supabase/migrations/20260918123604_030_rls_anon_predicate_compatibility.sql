-- RLS compatibility for anonymous requests.
-- These SECURITY DEFINER predicates expose only booleans derived from auth.uid().
-- For anon, auth.uid() is NULL, so they fail closed (false).
-- Granting EXECUTE prevents public RLS policies from raising 42501 while preserving row filters.

grant execute on function public.is_admin() to anon;
grant execute on function public.is_age_verified() to anon;
grant execute on function public.is_creator_owner(uuid) to anon;

comment on function public.is_admin() is
  'RLS predicate. Safe for anon execution: auth.uid() is NULL for anonymous requests, so result is false.';
comment on function public.is_age_verified() is
  'RLS predicate. Safe for anon execution: requires an authenticated matching verified profile; anonymous result is false.';
comment on function public.is_creator_owner(uuid) is
  'RLS predicate. Safe for anon execution: requires creator.user_id = auth.uid(); anonymous result is false.';
