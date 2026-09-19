-- Atomic production engagement mutations with counters kept consistent.
create schema if not exists private;
grant usage on schema private to authenticated,service_role;

create or replace function private.toggle_video_like(p_video_id uuid)
returns boolean language plpgsql security definer set search_path=public,private as $$
declare v_uid uuid:=auth.uid(); v_exists boolean;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.videos where id=p_video_id and is_removed=false) then raise exception 'video_not_found'; end if;
  select exists(select 1 from public.video_likes where video_id=p_video_id and user_id=v_uid) into v_exists;
  if v_exists then
    delete from public.video_likes where video_id=p_video_id and user_id=v_uid;
    update public.videos set likes_count=greatest(0,coalesce(likes_count,0)-1) where id=p_video_id;
    return false;
  end if;
  insert into public.video_likes(video_id,user_id) values(p_video_id,v_uid) on conflict do nothing;
  if found then update public.videos set likes_count=coalesce(likes_count,0)+1 where id=p_video_id; end if;
  return true;
end $$;

create or replace function private.toggle_video_favorite(p_video_id uuid)
returns boolean language plpgsql security definer set search_path=public,private as $$
declare v_uid uuid:=auth.uid(); v_exists boolean;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select exists(select 1 from public.favorites where video_id=p_video_id and user_id=v_uid) into v_exists;
  if v_exists then
    delete from public.favorites where video_id=p_video_id and user_id=v_uid;
    update public.videos set favorites_count=greatest(0,coalesce(favorites_count,0)-1) where id=p_video_id;
    return false;
  end if;
  insert into public.favorites(video_id,user_id) values(p_video_id,v_uid) on conflict do nothing;
  if found then update public.videos set favorites_count=coalesce(favorites_count,0)+1 where id=p_video_id; end if;
  return true;
end $$;

create or replace function private.toggle_creator_follow(p_creator_id uuid)
returns boolean language plpgsql security definer set search_path=public,private as $$
declare v_uid uuid:=auth.uid(); v_exists boolean;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if exists(select 1 from public.creators where id=p_creator_id and user_id=v_uid) then raise exception 'cannot_follow_self'; end if;
  select exists(select 1 from public.follows where creator_id=p_creator_id and follower_id=v_uid) into v_exists;
  if v_exists then
    delete from public.follows where creator_id=p_creator_id and follower_id=v_uid;
    update public.creators set total_followers=greatest(0,coalesce(total_followers,0)-1) where id=p_creator_id;
    return false;
  end if;
  insert into public.follows(creator_id,follower_id) values(p_creator_id,v_uid) on conflict do nothing;
  if found then update public.creators set total_followers=coalesce(total_followers,0)+1 where id=p_creator_id; end if;
  return true;
end $$;

revoke all on function private.toggle_video_like(uuid) from public;
revoke all on function private.toggle_video_favorite(uuid) from public;
revoke all on function private.toggle_creator_follow(uuid) from public;
grant execute on function private.toggle_video_like(uuid) to authenticated,service_role;
grant execute on function private.toggle_video_favorite(uuid) to authenticated,service_role;
grant execute on function private.toggle_creator_follow(uuid) to authenticated,service_role;

create or replace function public.toggle_video_like(p_video_id uuid)
returns boolean language sql security invoker set search_path=public,private as $$select private.toggle_video_like(p_video_id)$$;
create or replace function public.toggle_video_favorite(p_video_id uuid)
returns boolean language sql security invoker set search_path=public,private as $$select private.toggle_video_favorite(p_video_id)$$;
create or replace function public.toggle_creator_follow(p_creator_id uuid)
returns boolean language sql security invoker set search_path=public,private as $$select private.toggle_creator_follow(p_creator_id)$$;

revoke all on function public.toggle_video_like(uuid) from public,anon;
revoke all on function public.toggle_video_favorite(uuid) from public,anon;
revoke all on function public.toggle_creator_follow(uuid) from public,anon;
grant execute on function public.toggle_video_like(uuid) to authenticated;
grant execute on function public.toggle_video_favorite(uuid) to authenticated;
grant execute on function public.toggle_creator_follow(uuid) to authenticated;
