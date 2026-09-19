-- Trigger functions do not need to be callable through PostgREST.
revoke all on function public.initialize_video_system_fields() from public,anon,authenticated;
revoke all on function public.protect_video_system_fields() from public,anon,authenticated;
revoke all on function public.protect_live_system_fields() from public,anon,authenticated;
revoke all on function public.protect_creator_financial_fields() from public,anon,authenticated;
revoke all on function public.protect_profile_privileged_fields() from public,anon,authenticated;
