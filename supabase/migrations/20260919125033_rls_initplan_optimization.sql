-- Performance pass: prevent per-row re-evaluation of auth helpers in RLS policies.

-- Semantics are unchanged; auth.uid()/role()/jwt() are wrapped in scalar SELECT initplans.

alter policy "subject reads restrictions" on "public"."account_restrictions"
  using (((subject_user_id = (select auth.uid())) OR is_admin()));

alter policy "admins read log" on "public"."admin_change_log"
  using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = 'admin'::text)))));

alter policy "admins write log" on "public"."admin_change_log"
  with check (((changed_by = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = 'admin'::text))))));

alter policy "admins edit settings" on "public"."app_content_settings"
  using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = 'admin'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = 'admin'::text)))));

alter policy "Usuário cria seus checkouts" on "public"."checkout_sessions"
  with check (((select auth.uid()) = user_id));

alter policy "Usuário vê seus checkouts" on "public"."checkout_sessions"
  using ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "comment_likes_delete_own" on "public"."comment_likes"
  using (((select auth.uid()) = user_id));

alter policy "comment_likes_insert_own" on "public"."comment_likes"
  with check (((select auth.uid()) = user_id));

alter policy "Comentários moderados para leitura" on "public"."comments"
  using (((moderation_status = 'approved'::text) OR (user_id = (select auth.uid())) OR is_admin()));

alter policy "Usuários postam comentários" on "public"."comments"
  with check ((((select auth.uid()) = user_id) AND (NOT has_active_restriction('comment'::text))));

alter policy "user reads own access logs" on "public"."content_access_logs"
  using ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "Usuário gerencia preferências" on "public"."content_preferences"
  using (((select auth.uid()) = user_id));

alter policy "Usuários gerenciam seus desbloqueios" on "public"."content_unlocks"
  using (((select auth.uid()) = user_id));

alter policy "creators read own analytics" on "public"."creator_analytics_events"
  using ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_analytics_events.creator_id) AND (c.user_id = (select auth.uid()))))));

alter policy "Criadores veem seu balanço" on "public"."creator_balance"
  using ((EXISTS ( SELECT 1
   FROM creators
  WHERE ((creators.id = creator_balance.creator_id) AND (creators.user_id = (select auth.uid()))))));

alter policy "highlights_creator_delete" on "public"."creator_highlights"
  using ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_highlights.creator_id) AND (c.user_id = (select auth.uid())) AND (c.is_approved = true)))));

alter policy "highlights_creator_insert" on "public"."creator_highlights"
  with check ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_highlights.creator_id) AND (c.user_id = (select auth.uid())) AND (c.is_approved = true)))));

alter policy "highlights_creator_update" on "public"."creator_highlights"
  using ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_highlights.creator_id) AND (c.user_id = (select auth.uid())) AND (c.is_approved = true)))))
  with check ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_highlights.creator_id) AND (c.user_id = (select auth.uid())) AND (c.is_approved = true)))));

alter policy "Criadores gerenciam seus planos" on "public"."creator_plans"
  using ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_plans.creator_id) AND (c.user_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_plans.creator_id) AND (c.user_id = (select auth.uid()))))));

alter policy "Planos ativos de criadores são públicos" on "public"."creator_plans"
  using (((is_active = true) OR (EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_plans.creator_id) AND (c.user_id = (select auth.uid()))))) OR is_admin()));

alter policy "Criadores gerenciam próprias enquetes" on "public"."creator_polls"
  using ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_polls.creator_id) AND (c.user_id = (select auth.uid()))))));

alter policy "Criadores veem seu progresso" on "public"."creator_progress"
  using (((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_progress.creator_id) AND (c.user_id = (select auth.uid()))))) OR is_admin()));

alter policy "Usuários gerenciam seus pedidos" on "public"."creator_requests"
  using ((((select auth.uid()) = requester_id) OR (EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_requests.creator_id) AND (c.user_id = (select auth.uid())))))));

alter policy "Usuários veem suas assinaturas de criadores" on "public"."creator_subscriptions"
  using ((((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_subscriptions.creator_id) AND (c.user_id = (select auth.uid())))))));

alter policy "Usuário cria suas gorjetas" on "public"."creator_tips"
  with check ((((select auth.uid()) = sender_id) AND (NOT has_active_restriction('purchase'::text))));

alter policy "Usuário vê suas gorjetas enviadas" on "public"."creator_tips"
  using ((((select auth.uid()) = sender_id) OR (EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = creator_tips.creator_id) AND (c.user_id = (select auth.uid()))))) OR is_admin()));

alter policy "Criador edita dados não financeiros" on "public"."creators"
  using ((((select auth.uid()) = user_id) OR is_admin()))
  with check ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "Criadores aprovados são visíveis para todos" on "public"."creators"
  using (((is_approved = true) OR ((select auth.uid()) = user_id)));

alter policy "own messages" on "public"."direct_messages"
  using (((sender_id = (select auth.uid())) OR (recipient_id = (select auth.uid()))));

alter policy "send messages" on "public"."direct_messages"
  with check (((sender_id = (select auth.uid())) AND (sender_id <> recipient_id) AND (NOT has_active_restriction('message'::text))));

alter policy "Usuários acessam seus favoritos" on "public"."favorites"
  using (((select auth.uid()) = user_id));

alter policy "Usuários gerenciam seus follows" on "public"."follows"
  using (((select auth.uid()) = follower_id));

alter policy "live chat send" on "public"."live_chat_messages"
  with check (((user_id = (select auth.uid())) AND (NOT has_active_restriction('message'::text))));

alter policy "own reminders" on "public"."live_reminders"
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "Criadores gerenciam próprias lives" on "public"."live_sessions"
  using ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = live_sessions.creator_id) AND (c.user_id = (select auth.uid()))))));

alter policy "Criadores gerenciam suas lives" on "public"."live_sessions"
  using ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = live_sessions.creator_id) AND (c.user_id = (select auth.uid()))))))
  with check (((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = live_sessions.creator_id) AND (c.user_id = (select auth.uid()))))) AND (NOT has_active_restriction('live'::text))));

alter policy "Lives visíveis para usuários autenticados" on "public"."live_sessions"
  using (((select auth.uid()) IS NOT NULL));

alter policy "subject reads actions" on "public"."moderation_actions"
  using (((subject_user_id = (select auth.uid())) OR is_admin()));

alter policy "appeals visible" on "public"."moderation_appeals"
  using (((appellant_id = (select auth.uid())) OR is_admin()));

alter policy "submit own appeal" on "public"."moderation_appeals"
  with check ((appellant_id = (select auth.uid())));

alter policy "Usuário lê suas notificações" on "public"."notifications"
  using ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "Usuário marca suas notificações" on "public"."notifications"
  using ((((select auth.uid()) = user_id) OR is_admin()))
  with check ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "Usuário vê seus pagamentos" on "public"."payments"
  using ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "Itens de playlists próprias" on "public"."playlist_videos"
  using ((EXISTS ( SELECT 1
   FROM playlists p
  WHERE ((p.id = playlist_videos.playlist_id) AND (p.user_id = (select auth.uid()))))));

alter policy "Usuários gerenciam suas playlists" on "public"."playlists"
  using (((select auth.uid()) = user_id));

alter policy "Usuários votam uma vez" on "public"."poll_votes"
  with check (((select auth.uid()) = user_id));

alter policy "Votos próprios são visíveis" on "public"."poll_votes"
  using ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "own wishlist" on "public"."ppv_wishlist"
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "own premiere reminders" on "public"."premiere_reminders"
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "Usuário edita o próprio perfil" on "public"."profiles"
  using ((((select auth.uid()) = id) OR is_admin()))
  with check ((((select auth.uid()) = id) OR is_admin()));

alter policy "Usuário lê o próprio perfil" on "public"."profiles"
  using ((((select auth.uid()) = id) OR is_admin()));

alter policy "Usuários veem suas recompensas" on "public"."progress_rewards"
  using ((((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = progress_rewards.creator_id) AND (c.user_id = (select auth.uid())))))));

alter policy "Usuário vê suas compras" on "public"."purchases"
  using ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "Usuários veem seus eventos" on "public"."referral_events"
  using ((EXISTS ( SELECT 1
   FROM referral_links l
  WHERE ((l.id = referral_events.referral_link_id) AND (l.user_id = (select auth.uid()))))));

alter policy "Usuários gerenciam seus links" on "public"."referral_links"
  using (((select auth.uid()) = user_id));

alter policy "Usuário cria denúncia" on "public"."reports"
  with check (((select auth.uid()) = reporter_id));

alter policy "Usuário vê suas denúncias" on "public"."reports"
  using ((((select auth.uid()) = reporter_id) OR is_admin()));

alter policy "Usuário gerencia seus recursos" on "public"."safety_appeals"
  using ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "Usuários criam denúncias" on "public"."safety_reports"
  with check (((select auth.uid()) = reporter_id));

alter policy "Usuários veem suas denúncias" on "public"."safety_reports"
  using ((((select auth.uid()) = reporter_id) OR is_admin()));

alter policy "own saved" on "public"."saved_videos"
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "Criadores gerenciam próprias stories" on "public"."stories"
  using ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = stories.creator_id) AND (c.user_id = (select auth.uid()))))));

alter policy "creators manage own subscription plans" on "public"."subscription_plans"
  using ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = subscription_plans.creator_id) AND (c.user_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = subscription_plans.creator_id) AND (c.user_id = (select auth.uid()))))));

alter policy "Usuário vê suas assinaturas" on "public"."subscriptions"
  using ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "open tickets" on "public"."support_tickets"
  with check ((user_id = (select auth.uid())));

alter policy "own tickets" on "public"."support_tickets"
  using ((user_id = (select auth.uid())));

alter policy "Usuário vê seus distintivos" on "public"."user_badges"
  using (((select auth.uid()) = user_id));

alter policy "Usuários gerenciam bloqueios próprios" on "public"."user_blocks"
  using (((select auth.uid()) = blocker_id));

alter policy "Usuário vê seus pontos" on "public"."user_points"
  using (((select auth.uid()) = user_id));

alter policy "Usuários veem seu progresso" on "public"."user_progress"
  using (((select auth.uid()) = user_id));

alter policy "Usuário vê suas ações" on "public"."user_safety_actions"
  using ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "Usuários autenticados gerenciam seus likes" on "public"."video_likes"
  using (((select auth.uid()) = user_id));

alter policy "Usuários gerenciam próprias reações" on "public"."video_reactions"
  using (((select auth.uid()) = user_id));

alter policy "Criadores gerenciam tags dos próprios vídeos" on "public"."video_tags"
  using ((EXISTS ( SELECT 1
   FROM (videos v
     JOIN creators c ON ((c.id = v.creator_id)))
  WHERE ((v.id = video_tags.video_id) AND (c.user_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM (videos v
     JOIN creators c ON ((c.id = v.creator_id)))
  WHERE ((v.id = video_tags.video_id) AND (c.user_id = (select auth.uid()))))));

alter policy "user inserts own video views" on "public"."video_views"
  with check ((user_id = (select auth.uid())));

alter policy "user reads own video views" on "public"."video_views"
  using (((user_id = (select auth.uid())) OR is_admin()));

alter policy "Conteúdo publicado por nível de acesso" on "public"."videos"
  using ((((anonymous_access = true) AND (is_premium = false) AND (access_type = 'free'::text) AND (required_tier = 'free'::text) AND (content_level = 'sensual'::text) AND (moderation_status = 'approved'::text) AND (media_status = 'ready'::text) AND (is_draft = false) AND (is_removed = false)) OR (is_age_verified() AND (((is_draft = false) AND (is_removed = false)) OR (EXISTS ( SELECT 1
   FROM creators
  WHERE ((creators.id = videos.creator_id) AND (creators.user_id = (select auth.uid()))))) OR is_admin()))));

alter policy "Criador edita seus próprios vídeos" on "public"."videos"
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM creators
  WHERE ((creators.id = videos.creator_id) AND (creators.user_id = (select auth.uid())))))))
  with check ((is_admin() OR (EXISTS ( SELECT 1
   FROM creators
  WHERE ((creators.id = videos.creator_id) AND (creators.user_id = (select auth.uid())))))));

alter policy "Criadores podem inserir vídeos" on "public"."videos"
  with check (((EXISTS ( SELECT 1
   FROM creators c
  WHERE ((c.id = videos.creator_id) AND (c.user_id = (select auth.uid()))))) AND (NOT has_active_restriction('publish'::text))));

alter policy "wallet ledger owner read" on "public"."wallet_ledger"
  using ((((select auth.uid()) = user_id) OR is_admin()));

alter policy "own progress" on "public"."watch_progress"
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "Criador vê seus saques" on "public"."withdrawals"
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM creators
  WHERE ((creators.id = withdrawals.creator_id) AND (creators.user_id = (select auth.uid())))))));
