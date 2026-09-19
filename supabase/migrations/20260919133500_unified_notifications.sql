-- Unified notifications: new creator and new content are delivered automatically
-- instead of forcing the member to choose a category first.

create or replace function public.notify_new_creator()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.is_approved = true and (tg_op='INSERT' or old.is_approved is distinct from true) then
    insert into public.notifications(user_id,sender_id,type,title,message,target_id)
    select p.id,new.user_id,'new_creator','Novo criador no Velvet VIP',
      coalesce(new.display_name,'Um novo criador')||' acabou de chegar ao Velvet VIP.',
      new.id
    from public.profiles p
    where p.id <> new.user_id and coalesce(p.is_blocked,false)=false;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_new_creator on public.creators;
create trigger trg_notify_new_creator
after insert or update of is_approved on public.creators
for each row execute function public.notify_new_creator();

create or replace function public.notify_new_content()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.is_removed=false and new.is_draft=false and new.moderation_status='approved'
     and (tg_op='INSERT' or old.moderation_status is distinct from 'approved') then
    insert into public.notifications(user_id,sender_id,type,title,message,target_id)
    select f.follower_id,new.creator_id,'new_content','Novo conteúdo publicado',
      coalesce(c.display_name,'Um criador')||' publicou "'||left(new.title,80)||'".',
      new.id
    from public.follows f
    join public.creators c on c.id=new.creator_id
    where f.creator_id=new.creator_id
      and f.follower_id <> c.user_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_new_content on public.videos;
create trigger trg_notify_new_content
after insert or update of moderation_status,is_draft,is_removed on public.videos
for each row execute function public.notify_new_content();

revoke all on function public.notify_new_creator() from public,anon,authenticated;
revoke all on function public.notify_new_content() from public,anon,authenticated;
