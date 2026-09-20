-- Velvet VIP: configurable member/VIP/creator pages, flexible live access,
-- live tips metadata and paid 1:1 live requests.
alter table public.app_content_settings
  add column if not exists member_page_title text not null default 'Membro Velvet VIP',
  add column if not exists member_page_subtitle text not null default 'Descubra conteúdos e criadores.',
  add column if not exists vip_page_title text not null default 'Membro VIP',
  add column if not exists vip_page_subtitle text not null default 'Acesso premium aos seus criadores favoritos.',
  add column if not exists creator_page_title text not null default 'Creator Studio',
  add column if not exists creator_page_subtitle text not null default 'Publique, faça lives e monetize sua comunidade.';

alter table public.live_sessions
  drop constraint if exists live_sessions_required_plan_check;
alter table public.live_sessions
  add constraint live_sessions_required_plan_check
  check (required_plan in ('free','plus','vip'));

alter table public.live_sessions
  add column if not exists tips_enabled boolean not null default true,
  add column if not exists solo_enabled boolean not null default false,
  add column if not exists solo_price numeric(10,2) not null default 0 check (solo_price >= 0);

comment on column public.live_sessions.required_plan is 'free = aberta, plus = Plus/VIP, vip = somente VIP';
comment on column public.live_sessions.solo_enabled is 'Permite ao membro comprar uma sessão privada 1:1 com o criador.';
comment on column public.live_sessions.solo_price is 'Preço da sessão privada 1:1 em BRL.';

create table if not exists public.live_solo_requests (
  id uuid primary key default uuid_generate_v4(),
  live_id uuid not null references public.live_sessions(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'paid' check (status in ('paid','accepted','scheduled','completed','cancelled','refunded')),
  payment_gateway_id text unique,
  requested_at timestamptz not null default now(),
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.live_solo_requests enable row level security;
create policy "Membro vê suas lives solo" on public.live_solo_requests
  for select to authenticated using ((select auth.uid()) = requester_id or (select auth.uid()) in (select user_id from public.creators where id=creator_id) or public.is_admin());
create policy "Criador atualiza suas lives solo" on public.live_solo_requests
  for update to authenticated
  using ((select auth.uid()) in (select user_id from public.creators where id=creator_id) or public.is_admin())
  with check ((select auth.uid()) in (select user_id from public.creators where id=creator_id) or public.is_admin());
grant select,update on public.live_solo_requests to authenticated;
create index if not exists live_solo_requests_creator_status_idx on public.live_solo_requests(creator_id,status,created_at desc);
create index if not exists live_solo_requests_requester_idx on public.live_solo_requests(requester_id,created_at desc);

alter table public.checkout_sessions
  drop constraint if exists checkout_sessions_kind_check;
alter table public.checkout_sessions
  add constraint checkout_sessions_kind_check
  check (kind in ('platform_plan','creator_plan','tip','pay_per_view','live_solo'));
