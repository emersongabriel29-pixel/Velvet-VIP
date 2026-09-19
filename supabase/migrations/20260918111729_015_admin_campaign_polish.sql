-- Complete fields required by the polished Admin campaigns and Live moderation UI.
alter table public.ad_campaigns add column if not exists start_at timestamptz;
alter table public.ad_campaigns add column if not exists end_at timestamptz;
alter table public.ad_campaigns add column if not exists audience text not null default 'all';
alter table public.ad_campaigns add column if not exists creative_url text;
alter table public.live_sessions add column if not exists moderation_status text not null default 'approved'
  check (moderation_status in ('pending','reviewing','approved','removed'));
create index if not exists ad_campaigns_schedule_idx on public.ad_campaigns(status,start_at,end_at);
create index if not exists live_sessions_moderation_idx on public.live_sessions(moderation_status,status);
