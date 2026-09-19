-- Performance/RLS cleanup: remove exact duplicate admin policies and stop evaluating admin-only rules for anonymous traffic.
drop policy if exists "admins manage campaigns" on public.ad_campaigns;
drop policy if exists "admins manage platform plans" on public.platform_plans;

alter policy "Administradores gerenciam anúncios" on public.ad_campaigns to authenticated;
alter policy "admins read audit logs" on public.audit_logs to authenticated;
alter policy "admins manage comments" on public.comments to authenticated;
alter policy "admins read analytics" on public.creator_analytics_events to authenticated;
alter policy "admins read external provider events" on public.external_provider_events to authenticated;
alter policy "admins manage transactions" on public.financial_transactions to authenticated;
alter policy "admins manage fraud signals" on public.fraud_signals to authenticated;
alter policy "admins manage live sessions" on public.live_sessions to authenticated;
alter policy "admins manage media jobs" on public.media_processing_jobs to authenticated;
alter policy "admins read observability" on public.observability_events to authenticated;
alter policy "Administradores veem eventos de pagamento" on public.payment_events to authenticated;
alter policy "Administradores gerenciam planos" on public.platform_plans to authenticated;
alter policy "admins manage platform settings" on public.platform_settings to authenticated;
alter policy "Admin gerencia denúncias" on public.reports to authenticated;
alter policy "Administradores tratam denúncias" on public.safety_reports to authenticated;
alter policy "admins manage reports" on public.safety_reports to authenticated;
alter policy "Administradores gerenciam catálogo" on public.system_categories to authenticated;
alter policy "Administradores gerenciam tags" on public.system_tags to authenticated;
alter policy "Administradores gerenciam ações" on public.user_safety_actions to authenticated;
alter policy "admins manage videos" on public.videos to authenticated;
alter policy "Admin gerencia saques" on public.withdrawals to authenticated;
