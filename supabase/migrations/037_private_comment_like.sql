-- Keep the comment-like mutation callable by authenticated users without exposing a SECURITY DEFINER RPC.
create schema if not exists private;
grant usage on schema private to authenticated,service_role;

create or replace function private.toggle_comment_like(p_comment_id uuid)
returns boolean language plpgsql security definer set search_path=public,private as $$
declare
  v_uid uuid:=auth.uid();
  v_exists boolean;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.comments where id=p_comment_id and moderation_status<>'removed') then raise exception 'comment_not_found'; end if;
  select exists(select 1 from public.comment_likes where comment_id=p_comment_id and user_id=v_uid) into v_exists;
  if v_exists then
    delete from public.comment_likes where comment_id=p_comment_id and user_id=v_uid;
    update public.comments set likes_count=greatest(0,coalesce(likes_count,0)-1) where id=p_comment_id;
    return false;
  end if;
  insert into public.comment_likes(comment_id,user_id) values(p_comment_id,v_uid) on conflict do nothing;
  if found then update public.comments set likes_count=coalesce(likes_count,0)+1 where id=p_comment_id; end if;
  return true;
end $$;
revoke all on function private.toggle_comment_like(uuid) from public;
grant execute on function private.toggle_comment_like(uuid) to authenticated,service_role;

create or replace function public.toggle_comment_like(p_comment_id uuid)
returns boolean language sql security invoker set search_path=public,private
as $$select private.toggle_comment_like(p_comment_id)$$;
revoke all on function public.toggle_comment_like(uuid) from public,anon;
grant execute on function public.toggle_comment_like(uuid) to authenticated;
