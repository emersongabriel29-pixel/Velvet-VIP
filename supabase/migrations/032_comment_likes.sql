-- Persistent, duplicate-safe likes for comments
create table if not exists public.comment_likes (
 id uuid primary key default gen_random_uuid(), comment_id uuid not null references public.comments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), unique(comment_id,user_id));
alter table public.comment_likes enable row level security;
create policy "comment_likes_read" on public.comment_likes for select using (true);
create policy "comment_likes_insert_own" on public.comment_likes for insert with check (auth.uid()=user_id);
create policy "comment_likes_delete_own" on public.comment_likes for delete using (auth.uid()=user_id);
create or replace function public.toggle_comment_like(p_comment_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_exists boolean;
begin
 if v_uid is null then raise exception 'authentication required'; end if;
 select exists(select 1 from public.comment_likes where comment_id=p_comment_id and user_id=v_uid) into v_exists;
 if v_exists then delete from public.comment_likes where comment_id=p_comment_id and user_id=v_uid; update public.comments set likes_count=greatest(0,coalesce(likes_count,0)-1) where id=p_comment_id; return false;
 else insert into public.comment_likes(comment_id,user_id) values(p_comment_id,v_uid) on conflict do nothing; if found then update public.comments set likes_count=coalesce(likes_count,0)+1 where id=p_comment_id; end if; return true; end if;
end $$;
revoke all on function public.toggle_comment_like(uuid) from public;
grant execute on function public.toggle_comment_like(uuid) to authenticated;
