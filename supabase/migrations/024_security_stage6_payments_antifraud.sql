-- Security stage 6: provider-neutral payment integrity and antifraud primitives.
alter table public.wallet_ledger add column if not exists provider text;
create unique index if not exists wallet_ledger_provider_reference_unique
on public.wallet_ledger(provider,reference_id,entry_type) where provider is not null and reference_id is not null;

create table if not exists public.payment_security_events(
 id bigint generated always as identity primary key,
 payment_id uuid references public.payments(id) on delete set null,
 provider text not null,
 provider_payment_id text,
 reason text not null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.payment_security_events enable row level security;
create policy "admins read payment security events" on public.payment_security_events for select to authenticated using(public.is_admin());

create or replace function public.record_payment_security_event(p_payment_id uuid,p_provider text,p_provider_payment_id text,p_reason text,p_metadata jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path=public as $$
declare eid bigint;
begin
 if auth.uid() is not null then raise exception 'server_only' using errcode='42501'; end if;
 insert into public.payment_security_events(payment_id,provider,provider_payment_id,reason,metadata)
 values(p_payment_id,left(p_provider,40),left(p_provider_payment_id,200),left(p_reason,160),coalesce(p_metadata,'{}'::jsonb)) returning id into eid;
 return eid;
end $$;
revoke all on function public.record_payment_security_event(uuid,text,text,text,jsonb) from public,anon,authenticated;

create table if not exists public.payment_provider_events(
 id bigint generated always as identity primary key,
 provider text not null,
 external_event_id text not null,
 event_type text,
 payment_reference text,
 payload_hash text,
 received_at timestamptz not null default now(),
 processed_at timestamptz,
 unique(provider,external_event_id)
);
alter table public.payment_provider_events enable row level security;
create policy "admins read provider payment events" on public.payment_provider_events for select to authenticated using(public.is_admin());
