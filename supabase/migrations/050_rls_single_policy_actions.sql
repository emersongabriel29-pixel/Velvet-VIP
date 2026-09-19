-- Performance/RLS cleanup: preserve access semantics while ensuring one permissive policy per role/action.

-- Admin-managed tables that already have SELECT policies covering admins.
drop policy if exists "admins manage restrictions" on public.account_restrictions;
create policy "admins insert restrictions" on public.account_restrictions for insert to authenticated with check (public.is_admin());
create policy "admins update restrictions" on public.account_restrictions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete restrictions" on public.account_restrictions for delete to authenticated using (public.is_admin());

drop policy if exists "Administradores gerenciam anúncios" on public.ad_campaigns;
create policy "admins insert campaigns" on public.ad_campaigns for insert to authenticated with check (public.is_admin());
create policy "admins update campaigns" on public.ad_campaigns for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete campaigns" on public.ad_campaigns for delete to authenticated using (public.is_admin());

drop policy if exists "admins edit settings" on public.app_content_settings;
create policy "admins insert app settings" on public.app_content_settings for insert to authenticated
  with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
create policy "admins update app settings" on public.app_content_settings for update to authenticated
  using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
  with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
create policy "admins delete app settings" on public.app_content_settings for delete to authenticated
  using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists "admins manage comments" on public.comments;
create policy "admins update comments" on public.comments for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete comments" on public.comments for delete to authenticated using (public.is_admin());

-- Creator-owned resources: merge owner visibility into the single SELECT policy, then split writes.
alter policy "users read active bundles" on public.content_bundles
  using (is_active or public.is_creator_owner(creator_id));
drop policy if exists "creator manages bundles" on public.content_bundles;
create policy "creator inserts bundles" on public.content_bundles for insert to authenticated
  with check (public.is_creator_owner(creator_id) and not public.has_active_restriction('monetization'));
create policy "creator updates bundles" on public.content_bundles for update to authenticated
  using (public.is_creator_owner(creator_id))
  with check (public.is_creator_owner(creator_id) and not public.has_active_restriction('monetization'));
create policy "creator deletes bundles" on public.content_bundles for delete to authenticated
  using (public.is_creator_owner(creator_id));

alter policy "users read active coupons" on public.coupons
  using (
    (is_active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()))
    or (creator_id is not null and public.is_creator_owner(creator_id))
  );
drop policy if exists "creator manages coupons" on public.coupons;
create policy "creator inserts coupons" on public.coupons for insert to authenticated
  with check (creator_id is not null and public.is_creator_owner(creator_id) and not public.has_active_restriction('monetization'));
create policy "creator updates coupons" on public.coupons for update to authenticated
  using (creator_id is not null and public.is_creator_owner(creator_id))
  with check (creator_id is not null and public.is_creator_owner(creator_id) and not public.has_active_restriction('monetization'));
create policy "creator deletes coupons" on public.coupons for delete to authenticated
  using (creator_id is not null and public.is_creator_owner(creator_id));

drop policy if exists "admins read analytics" on public.creator_analytics_events;
alter policy "creators read own analytics" on public.creator_analytics_events
  to authenticated
  using (
    public.is_admin()
    or exists(select 1 from public.creators c where c.id=creator_analytics_events.creator_id and c.user_id=(select auth.uid()))
  );

drop policy if exists "Criadores gerenciam seus planos" on public.creator_plans;
create policy "creator inserts plans" on public.creator_plans for insert to authenticated
  with check (exists(select 1 from public.creators c where c.id=creator_plans.creator_id and c.user_id=(select auth.uid())));
create policy "creator updates plans" on public.creator_plans for update to authenticated
  using (exists(select 1 from public.creators c where c.id=creator_plans.creator_id and c.user_id=(select auth.uid())))
  with check (exists(select 1 from public.creators c where c.id=creator_plans.creator_id and c.user_id=(select auth.uid())));
create policy "creator deletes plans" on public.creator_plans for delete to authenticated
  using (exists(select 1 from public.creators c where c.id=creator_plans.creator_id and c.user_id=(select auth.uid())));

alter policy "Enquetes ativas são públicas" on public.creator_polls
  using (
    is_active=true or public.is_admin()
    or exists(select 1 from public.creators c where c.id=creator_polls.creator_id and c.user_id=(select auth.uid()))
  );
drop policy if exists "Criadores gerenciam próprias enquetes" on public.creator_polls;
create policy "creator inserts polls" on public.creator_polls for insert to authenticated
  with check (exists(select 1 from public.creators c where c.id=creator_polls.creator_id and c.user_id=(select auth.uid())));
create policy "creator updates polls" on public.creator_polls for update to authenticated
  using (exists(select 1 from public.creators c where c.id=creator_polls.creator_id and c.user_id=(select auth.uid())))
  with check (exists(select 1 from public.creators c where c.id=creator_polls.creator_id and c.user_id=(select auth.uid())));
create policy "creator deletes polls" on public.creator_polls for delete to authenticated
  using (exists(select 1 from public.creators c where c.id=creator_polls.creator_id and c.user_id=(select auth.uid())));

drop policy if exists "admins manage transactions" on public.financial_transactions;
create policy "admins insert transactions" on public.financial_transactions for insert to authenticated with check (public.is_admin());
create policy "admins update transactions" on public.financial_transactions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete transactions" on public.financial_transactions for delete to authenticated using (public.is_admin());

drop policy if exists "Usuários gerenciam seus follows" on public.follows;
create policy "users insert own follows" on public.follows for insert to authenticated with check ((select auth.uid())=follower_id);
create policy "users delete own follows" on public.follows for delete to authenticated using ((select auth.uid())=follower_id);

-- Lives: one policy per write action combines creator and admin; SELECT includes approved/admin/owner.
alter policy "Lives aprovadas são públicas" on public.live_sessions
  using (
    moderation_status='approved'
    or public.is_admin()
    or exists(select 1 from public.creators c where c.id=live_sessions.creator_id and c.user_id=(select auth.uid()))
  );
drop policy if exists "Criadores gerenciam suas lives" on public.live_sessions;
drop policy if exists "admins manage live sessions" on public.live_sessions;
create policy "live insert authorized" on public.live_sessions for insert to authenticated
  with check (
    public.is_admin()
    or (
      exists(select 1 from public.creators c where c.id=live_sessions.creator_id and c.user_id=(select auth.uid()))
      and not public.has_active_restriction('live')
    )
  );
create policy "live update authorized" on public.live_sessions for update to authenticated
  using (
    public.is_admin()
    or exists(select 1 from public.creators c where c.id=live_sessions.creator_id and c.user_id=(select auth.uid()))
  )
  with check (
    public.is_admin()
    or (
      exists(select 1 from public.creators c where c.id=live_sessions.creator_id and c.user_id=(select auth.uid()))
      and not public.has_active_restriction('live')
    )
  );
create policy "live delete authorized" on public.live_sessions for delete to authenticated
  using (
    public.is_admin()
    or exists(select 1 from public.creators c where c.id=live_sessions.creator_id and c.user_id=(select auth.uid()))
  );

drop policy if exists "admins manage media jobs" on public.media_processing_jobs;
alter policy "creators read own media jobs" on public.media_processing_jobs
  to authenticated
  using (
    public.is_admin()
    or exists(select 1 from public.videos v where v.id=media_processing_jobs.video_id and public.is_creator_owner(v.creator_id))
  );
create policy "admins insert media jobs" on public.media_processing_jobs for insert to authenticated with check (public.is_admin());
create policy "admins update media jobs" on public.media_processing_jobs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete media jobs" on public.media_processing_jobs for delete to authenticated using (public.is_admin());

drop policy if exists "admins manage actions" on public.moderation_actions;
create policy "admins insert moderation actions" on public.moderation_actions for insert to authenticated with check (public.is_admin());
create policy "admins update moderation actions" on public.moderation_actions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete moderation actions" on public.moderation_actions for delete to authenticated using (public.is_admin());

drop policy if exists "Administradores gerenciam planos" on public.platform_plans;
create policy "admins insert platform plans" on public.platform_plans for insert to authenticated with check (public.is_admin());
create policy "admins update platform plans" on public.platform_plans for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete platform plans" on public.platform_plans for delete to authenticated using (public.is_admin());

drop policy if exists "creator manages premieres" on public.premieres;
create policy "creator inserts premieres" on public.premieres for insert to authenticated
  with check (public.is_creator_owner(creator_id) and not public.has_active_restriction('publish'));
create policy "creator updates premieres" on public.premieres for update to authenticated
  using (public.is_creator_owner(creator_id))
  with check (public.is_creator_owner(creator_id) and not public.has_active_restriction('publish'));
create policy "creator deletes premieres" on public.premieres for delete to authenticated using (public.is_creator_owner(creator_id));

drop policy if exists "admins manage reports" on public.safety_reports;
create policy "admins update safety reports" on public.safety_reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete safety reports" on public.safety_reports for delete to authenticated using (public.is_admin());

alter policy "Stories aprovados são públicas" on public.stories
  using (
    (moderation_status='approved' and expires_at>now())
    or exists(select 1 from public.creators c where c.id=stories.creator_id and c.user_id=(select auth.uid()))
  );
drop policy if exists "Criadores gerenciam próprias stories" on public.stories;
create policy "creator inserts stories" on public.stories for insert to authenticated
  with check (exists(select 1 from public.creators c where c.id=stories.creator_id and c.user_id=(select auth.uid())));
create policy "creator updates stories" on public.stories for update to authenticated
  using (exists(select 1 from public.creators c where c.id=stories.creator_id and c.user_id=(select auth.uid())))
  with check (exists(select 1 from public.creators c where c.id=stories.creator_id and c.user_id=(select auth.uid())));
create policy "creator deletes stories" on public.stories for delete to authenticated
  using (exists(select 1 from public.creators c where c.id=stories.creator_id and c.user_id=(select auth.uid())));

drop policy if exists "admin reads all tickets" on public.support_tickets;
alter policy "own tickets" on public.support_tickets
  using (user_id=(select auth.uid()) or public.is_admin());

drop policy if exists "Administradores gerenciam catálogo" on public.system_categories;
create policy "admins insert categories" on public.system_categories for insert to authenticated with check (public.is_admin());
create policy "admins update categories" on public.system_categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete categories" on public.system_categories for delete to authenticated using (public.is_admin());

drop policy if exists "Administradores gerenciam tags" on public.system_tags;
create policy "admins insert tags" on public.system_tags for insert to authenticated with check (public.is_admin());
create policy "admins update tags" on public.system_tags for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete tags" on public.system_tags for delete to authenticated using (public.is_admin());

drop policy if exists "Administradores gerenciam ações" on public.user_safety_actions;
create policy "admins insert user safety actions" on public.user_safety_actions for insert to authenticated with check (public.is_admin());
create policy "admins update user safety actions" on public.user_safety_actions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete user safety actions" on public.user_safety_actions for delete to authenticated using (public.is_admin());

drop policy if exists "Usuários autenticados gerenciam seus likes" on public.video_likes;
create policy "users insert own video likes" on public.video_likes for insert to authenticated with check ((select auth.uid())=user_id);
create policy "users delete own video likes" on public.video_likes for delete to authenticated using ((select auth.uid())=user_id);

drop policy if exists "Usuários gerenciam próprias reações" on public.video_reactions;
create policy "users insert own video reactions" on public.video_reactions for insert to authenticated with check ((select auth.uid())=user_id);
create policy "users update own video reactions" on public.video_reactions for update to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "users delete own video reactions" on public.video_reactions for delete to authenticated using ((select auth.uid())=user_id);

alter policy "Tags de vídeos publicados são públicas" on public.video_tags
  using (
    exists(select 1 from public.videos v where v.id=video_tags.video_id and v.is_draft=false and v.is_removed=false and v.moderation_status='approved')
    or exists(select 1 from public.videos v join public.creators c on c.id=v.creator_id where v.id=video_tags.video_id and c.user_id=(select auth.uid()))
  );
drop policy if exists "Criadores gerenciam tags dos próprios vídeos" on public.video_tags;
create policy "creator inserts video tags" on public.video_tags for insert to authenticated
  with check (exists(select 1 from public.videos v join public.creators c on c.id=v.creator_id where v.id=video_tags.video_id and c.user_id=(select auth.uid())));
create policy "creator updates video tags" on public.video_tags for update to authenticated
  using (exists(select 1 from public.videos v join public.creators c on c.id=v.creator_id where v.id=video_tags.video_id and c.user_id=(select auth.uid())))
  with check (exists(select 1 from public.videos v join public.creators c on c.id=v.creator_id where v.id=video_tags.video_id and c.user_id=(select auth.uid())));
create policy "creator deletes video tags" on public.video_tags for delete to authenticated
  using (exists(select 1 from public.videos v join public.creators c on c.id=v.creator_id where v.id=video_tags.video_id and c.user_id=(select auth.uid())));

-- Videos: SELECT and UPDATE already include admin; fold admin INSERT into the creator policy and keep admin-only DELETE.
alter policy "Conteúdo publicado por nível de acesso" on public.videos
  using (
    public.is_admin()
    or (
      anonymous_access=true and is_premium=false and access_type='free' and required_tier='free'
      and content_level='sensual' and moderation_status='approved' and media_status='ready'
      and is_draft=false and is_removed=false
    )
    or (
      public.is_age_verified()
      and (
        (is_draft=false and is_removed=false)
        or exists(select 1 from public.creators c where c.id=videos.creator_id and c.user_id=(select auth.uid()))
      )
    )
  );
alter policy "Criadores podem inserir vídeos" on public.videos
  with check (
    public.is_admin()
    or (
      exists(select 1 from public.creators c where c.id=videos.creator_id and c.user_id=(select auth.uid()))
      and not public.has_active_restriction('publish')
    )
  );
drop policy if exists "admins manage videos" on public.videos;
create policy "admins delete videos" on public.videos for delete to authenticated using (public.is_admin());
