-- Service-only bridge for Edge Functions to read private live playback state.
create or replace function public.get_live_stream_state(p_live_id uuid)
returns jsonb language sql stable security definer set search_path=public,private as $$
  select case when s.live_id is null then null else jsonb_build_object(
    'provider',s.provider,
    'room_id',s.room_id,
    'playback_reference',s.playback_reference,
    'playback_sources',s.playback_sources,
    'updated_at',s.updated_at
  ) end
  from (select p_live_id as requested_id) r
  left join private.live_stream_state s on s.live_id=r.requested_id;
$$;
revoke all on function public.get_live_stream_state(uuid) from public,anon,authenticated;
grant execute on function public.get_live_stream_state(uuid) to service_role;
grant execute on function public.attach_streaming_room(uuid,text,text,text) to service_role;
grant execute on function public.set_live_playback_sources(uuid,jsonb) to service_role;
