-- Production live playback state stays outside the exposed public schema.
alter table public.live_sessions add column if not exists updated_at timestamptz not null default now();
alter table public.live_sessions add column if not exists available_qualities text[] not null default '{}'::text[];

create table if not exists private.live_stream_state(
  live_id uuid primary key references public.live_sessions(id) on delete cascade,
  provider text not null,
  room_id text not null,
  playback_reference text,
  playback_sources jsonb not null default '[]'::jsonb check (jsonb_typeof(playback_sources)='array'),
  updated_at timestamptz not null default now()
);
revoke all on private.live_stream_state from public,anon,authenticated;

insert into private.live_stream_state(live_id,provider,room_id,playback_reference)
select id,streaming_provider,streaming_room_id,playback_reference
from public.live_sessions
where streaming_provider is not null and streaming_room_id is not null
on conflict(live_id) do update set
 provider=excluded.provider,room_id=excluded.room_id,
 playback_reference=coalesce(excluded.playback_reference,private.live_stream_state.playback_reference),
 updated_at=now();

update public.live_sessions
set streaming_room_id=null,playback_reference=null
where streaming_room_id is not null or playback_reference is not null;

create or replace function public.attach_streaming_room(p_live_id uuid,p_provider text,p_room_id text,p_playback_reference text default null)
returns void language plpgsql security definer set search_path=public,private as $$
begin
 if auth.uid() is not null then raise exception 'server_only' using errcode='42501'; end if;
 if nullif(trim(p_provider),'') is null or nullif(trim(p_room_id),'') is null then raise exception 'provider_room_required'; end if;
 insert into private.live_stream_state(live_id,provider,room_id,playback_reference,updated_at)
 values(p_live_id,left(trim(p_provider),80),left(trim(p_room_id),240),p_playback_reference,now())
 on conflict(live_id) do update set provider=excluded.provider,room_id=excluded.room_id,
 playback_reference=excluded.playback_reference,updated_at=now();
 update public.live_sessions
 set streaming_provider=left(trim(p_provider),80),updated_at=now()
 where id=p_live_id;
 if not found then raise exception 'live_not_found'; end if;
end $$;
revoke all on function public.attach_streaming_room(uuid,text,text,text) from public,anon,authenticated;

create or replace function public.set_live_playback_sources(p_live_id uuid,p_sources jsonb)
returns void language plpgsql security definer set search_path=public,private as $$
declare v_labels text[];
begin
 if auth.uid() is not null then raise exception 'server_only' using errcode='42501'; end if;
 if p_sources is null or jsonb_typeof(p_sources)<>'array' or jsonb_array_length(p_sources)>12 then raise exception 'invalid_sources'; end if;
 select coalesce(array_agg(distinct left(nullif(trim(x->>'label'),''),20)) filter(where nullif(trim(x->>'label'),'') is not null),'{}'::text[])
 into v_labels from jsonb_array_elements(p_sources) x;
 update private.live_stream_state set playback_sources=p_sources,updated_at=now() where live_id=p_live_id;
 if not found then raise exception 'stream_not_attached'; end if;
 update public.live_sessions set available_qualities=v_labels,updated_at=now() where id=p_live_id;
end $$;
revoke all on function public.set_live_playback_sources(uuid,jsonb) from public,anon,authenticated;

create or replace function public.protect_live_system_fields()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if tg_op='UPDATE' and coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    new.creator_id := old.creator_id;
    new.moderation_status := old.moderation_status;
    new.streaming_provider := old.streaming_provider;
    new.streaming_room_id := old.streaming_room_id;
    new.playback_reference := old.playback_reference;
    new.available_qualities := old.available_qualities;
  end if;
  new.updated_at:=now();
  return new;
end $$;
