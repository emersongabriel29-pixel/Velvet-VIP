-- Security stage 2: RLS, ownership and restriction enforcement.
-- Defense in depth: authorization is enforced in PostgreSQL, not only in the client.

-- Product-suite tables that previously had no RLS.
alter table public.coupons enable row level security;
alter table public.content_bundles enable row level security;
alter table public.bundle_videos enable row level security;
alter table public.creator_goals enable row level security;
alter table public.premieres enable row level security;
alter table public.live_clips enable row level security;

drop policy if exists "creator manages coupons" on public.coupons;
create policy "creator manages coupons" on public.coupons for all to authenticated
 using (creator_id is not null and public.is_creator_owner(creator_id))
 with check (creator_id is not null and public.is_creator_owner(creator_id) and not public.has_active_restriction('monetization'));
drop policy if exists "users read active coupons" on public.coupons;
create policy "users read active coupons" on public.coupons for select to authenticated
 using (is_active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));

drop policy if exists "creator manages bundles" on public.content_bundles;
create policy "creator manages bundles" on public.content_bundles for all to authenticated
 using (public.is_creator_owner(creator_id))
 with check (public.is_creator_owner(creator_id) and not public.has_active_restriction('monetization'));
drop policy if exists "users read active bundles" on public.content_bundles;
create policy "users read active bundles" on public.content_bundles for select to authenticated using(is_active);

drop policy if exists "creator manages bundle videos" on public.bundle_videos;
create policy "creator manages bundle videos" on public.bundle_videos for all to authenticated
 using (exists(select 1 from public.content_bundles b where b.id=bundle_id and public.is_creator_owner(b.creator_id)))
 with check (exists(select 1 from public.content_bundles b where b.id=bundle_id and public.is_creator_owner(b.creator_id) and not public.has_active_restriction('monetization')));

drop policy if exists "creator manages goals" on public.creator_goals;
create policy "creator manages goals" on public.creator_goals for all to authenticated
 using(public.is_creator_owner(creator_id)) with check(public.is_creator_owner(creator_id));

drop policy if exists "creator manages premieres" on public.premieres;
create policy "creator manages premieres" on public.premieres for all to authenticated
 using(public.is_creator_owner(creator_id))
 with check(public.is_creator_owner(creator_id) and not public.has_active_restriction('publish'));
drop policy if exists "users read premieres" on public.premieres;
create policy "users read premieres" on public.premieres for select to authenticated using(true);

drop policy if exists "creator manages clips" on public.live_clips;
create policy "creator manages clips" on public.live_clips for all to authenticated
 using(public.is_creator_owner(creator_id))
 with check(public.is_creator_owner(creator_id) and not public.has_active_restriction('publish'));

-- Granular disciplinary restrictions on existing write paths.
drop policy if exists "Usuários postam comentários" on public.comments;
create policy "Usuários postam comentários" on public.comments for insert to authenticated
 with check(auth.uid()=user_id and not public.has_active_restriction('comment'));

drop policy if exists "live chat send" on public.live_chat_messages;
create policy "live chat send" on public.live_chat_messages for insert to authenticated
 with check(user_id=auth.uid() and not public.has_active_restriction('message'));

drop policy if exists "send messages" on public.direct_messages;
create policy "send messages" on public.direct_messages for insert to authenticated
 with check(sender_id=auth.uid() and sender_id<>recipient_id and not public.has_active_restriction('message'));

drop policy if exists "Criadores podem inserir vídeos" on public.videos;
create policy "Criadores podem inserir vídeos" on public.videos for insert to authenticated
 with check(exists(select 1 from public.creators c where c.id=creator_id and c.user_id=auth.uid())
            and not public.has_active_restriction('publish'));

drop policy if exists "Criadores gerenciam suas lives" on public.live_sessions;
create policy "Criadores gerenciam suas lives" on public.live_sessions for all to authenticated
 using(exists(select 1 from public.creators c where c.id=creator_id and c.user_id=auth.uid()))
 with check(exists(select 1 from public.creators c where c.id=creator_id and c.user_id=auth.uid())
            and not public.has_active_restriction('live'));

drop policy if exists "Usuário cria suas gorjetas" on public.creator_tips;
create policy "Usuário cria suas gorjetas" on public.creator_tips for insert to authenticated
 with check(auth.uid()=sender_id and not public.has_active_restriction('purchase'));

-- Prevent users from changing protected profile security/financial fields through a normal profile update.
create or replace function public.protect_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.age_verified := old.age_verified;
    new.age_verified_at := old.age_verified_at;
    new.is_blocked := old.is_blocked;
    new.is_suspended := old.is_suspended;
    new.wallet_balance := old.wallet_balance;
  end if;
  return new;
end $$;
revoke all on function public.protect_profile_privileged_fields() from public, anon, authenticated;
drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields before update on public.profiles
for each row execute function public.protect_profile_privileged_fields();

-- Admin access is explicit rather than relying on broad public policies.
drop policy if exists "admin reads all tickets" on public.support_tickets;
create policy "admin reads all tickets" on public.support_tickets for select to authenticated using(public.is_admin());
drop policy if exists "admin updates tickets" on public.support_tickets;
create policy "admin updates tickets" on public.support_tickets for update to authenticated
 using(public.is_admin()) with check(public.is_admin());
