-- Production stage 3: provider-neutral external-service integration state.
create table if not exists public.external_provider_events(
 id uuid primary key default uuid_generate_v4(),
 provider_type text not null check(provider_type in ('age_verification','payment','streaming','moderation','observability')),
 provider text not null,
 external_event_id text not null,
 subject_user_id uuid references public.profiles(id) on delete set null,
 status text not null default 'received',
 payload_hash text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 processed_at timestamptz,
 unique(provider_type,provider,external_event_id)
);
alter table public.external_provider_events enable row level security;
drop policy if exists "admins read external provider events" on public.external_provider_events;
create policy "admins read external provider events" on public.external_provider_events for select using(public.is_admin());

alter table public.live_sessions add column if not exists streaming_provider text;
alter table public.live_sessions add column if not exists streaming_room_id text;
alter table public.live_sessions add column if not exists playback_reference text;

create or replace function public.attach_streaming_room(p_live_id uuid,p_provider text,p_room_id text,p_playback_reference text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null then raise exception 'server_only' using errcode='42501'; end if;
 if nullif(trim(p_provider),'') is null or nullif(trim(p_room_id),'') is null then raise exception 'provider_room_required'; end if;
 update public.live_sessions set streaming_provider=left(trim(p_provider),80),streaming_room_id=left(trim(p_room_id),240),playback_reference=p_playback_reference,updated_at=now() where id=p_live_id;
 if not found then raise exception 'live_not_found'; end if;
end $$;
revoke all on function public.attach_streaming_room(uuid,text,text,text) from public,anon,authenticated;
