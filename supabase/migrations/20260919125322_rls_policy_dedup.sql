-- Performance/RLS cleanup: remove legacy overlaps and scope owner writes to authenticated sessions.
drop policy if exists "active platform plans are public" on public.platform_plans;
drop policy if exists "Criadores gerenciam próprias lives" on public.live_sessions;
drop policy if exists "Lives visíveis para usuários autenticados" on public.live_sessions;
drop policy if exists "Administradores tratam denúncias" on public.safety_reports;

alter policy "Criadores gerenciam seus planos" on public.creator_plans to authenticated;
alter policy "Criadores gerenciam próprias enquetes" on public.creator_polls to authenticated;
alter policy "Usuários gerenciam seus follows" on public.follows to authenticated;
alter policy "Criadores gerenciam próprias stories" on public.stories to authenticated;
alter policy "Usuários autenticados gerenciam seus likes" on public.video_likes to authenticated;
alter policy "Usuários gerenciam próprias reações" on public.video_reactions to authenticated;
alter policy "Criadores gerenciam tags dos próprios vídeos" on public.video_tags to authenticated;
alter policy "Criador edita seus próprios vídeos" on public.videos to authenticated;
alter policy "Usuários criam denúncias" on public.safety_reports to authenticated;
