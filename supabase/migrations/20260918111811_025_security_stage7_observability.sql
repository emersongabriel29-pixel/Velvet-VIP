-- Security stage 7: observability, alerts and recovery metadata.
create table if not exists public.security_alerts(
 id bigint generated always as identity primary key,
 severity text not null check(severity in ('info','warning','critical')),
 source text not null,
 event_type text not null,
 fingerprint text not null,
 metadata jsonb not null default '{}'::jsonb,
 first_seen_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 occurrences integer not null default 1,
 acknowledged_at timestamptz,
 acknowledged_by uuid references public.profiles(id),
 unique(source,fingerprint)
);
alter table public.security_alerts enable row level security;
create policy "admins read security alerts" on public.security_alerts for select to authenticated using(public.is_admin());
create policy "admins acknowledge security alerts" on public.security_alerts for update to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.raise_security_alert(p_severity text,p_source text,p_event_type text,p_fingerprint text,p_metadata jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path=public as $$
declare aid bigint;
begin
 if auth.uid() is not null then raise exception 'server_only' using errcode='42501'; end if;
 if p_severity not in ('info','warning','critical') then raise exception 'invalid_severity'; end if;
 insert into public.security_alerts(severity,source,event_type,fingerprint,metadata)
 values(p_severity,left(p_source,80),left(p_event_type,120),left(p_fingerprint,200),coalesce(p_metadata,'{}'::jsonb))
 on conflict(source,fingerprint) do update set last_seen_at=now(),occurrences=public.security_alerts.occurrences+1,metadata=excluded.metadata
 returning id into aid;
 return aid;
end $$;
revoke all on function public.raise_security_alert(text,text,text,text,jsonb) from public,anon,authenticated;

create table if not exists public.recovery_verifications(
 id bigint generated always as identity primary key,
 verification_type text not null,
 status text not null check(status in ('pending','passed','failed')),
 details jsonb not null default '{}'::jsonb,
 verified_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.recovery_verifications enable row level security;
create policy "admins read recovery verifications" on public.recovery_verifications for select to authenticated using(public.is_admin());
