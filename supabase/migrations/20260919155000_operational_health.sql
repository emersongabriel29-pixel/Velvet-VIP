-- Admin operational health snapshot for production triage.
create or replace function public.admin_operational_health()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'admin_required' using errcode='42501';
  end if;

  select jsonb_build_object(
    'unprocessed_payment_events',(
      select count(*) from public.payment_events
       where status='received' and processed_at is null and created_at < now()-interval '5 minutes'
    ),
    'stuck_media_jobs',(
      select count(*) from public.media_processing_jobs
       where status in ('queued','processing') and updated_at < now()-interval '30 minutes'
    ),
    'failed_media_jobs',(
      select count(*) from public.media_processing_jobs where status='error'
    ),
    'unprocessed_provider_events',(
      select count(*) from public.external_provider_events
       where processed_at is null and created_at < now()-interval '15 minutes'
    ),
    'unacknowledged_critical_alerts',(
      select count(*) from public.security_alerts
       where severity='critical' and acknowledged_at is null
    ),
    'stale_live_sessions',(
      select count(*) from public.live_sessions
       where status='live' and updated_at < now()-interval '10 minutes'
    ),
    'checked_at',now()
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_operational_health() from public,anon;
grant execute on function public.admin_operational_health() to authenticated;
