-- Live sessions + long-form video metadata
alter table public.videos add column if not exists content_kind text not null default 'short' check (content_kind in ('short','long'));
alter table public.videos add column if not exists orientation text not null default 'vertical' check (orientation in ('vertical','horizontal','square'));

create table if not exists public.live_sessions (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  title text not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','cancelled')),
  required_plan text not null default 'plus' check (required_plan in ('plus','vip')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.live_sessions enable row level security;
drop policy if exists "Lives visíveis para usuários autenticados" on public.live_sessions;
create policy "Lives visíveis para usuários autenticados" on public.live_sessions for select using (auth.uid() is not null);
drop policy if exists "Criadores gerenciam suas lives" on public.live_sessions;
create policy "Criadores gerenciam suas lives" on public.live_sessions for all using (exists(select 1 from public.creators c where c.id=creator_id and c.user_id=auth.uid())) with check (exists(select 1 from public.creators c where c.id=creator_id and c.user_id=auth.uid()));
create index if not exists live_sessions_status_schedule_idx on public.live_sessions(status, scheduled_at);
