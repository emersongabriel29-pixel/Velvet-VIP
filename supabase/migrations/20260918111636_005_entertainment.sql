-- Velvet VIP: entretenimento, comunidade e engajamento
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  caption TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected','removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playlist_videos (
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, video_id)
);

CREATE TABLE IF NOT EXISTS public.video_reactions (
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like','love','fire','laugh','wow')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (video_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.creator_polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  poll_id UUID NOT NULL REFERENCES public.creator_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INT NOT NULL CHECK (option_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','blocked')),
  required_plan TEXT NOT NULL DEFAULT 'plus' CHECK (required_plan IN ('plus','vip')),
  access_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (access_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  price NUMERIC(10,2) CHECK (price >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','completed','cancelled')),
  consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_points (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INT NOT NULL DEFAULT 0 CHECK (points >= 0),
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

CREATE TABLE IF NOT EXISTS public.content_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  blocked_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  preferred_languages TEXT[] NOT NULL DEFAULT ARRAY['pt-BR']::TEXT[],
  autoplay BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories aprovados são públicas" ON public.stories FOR SELECT USING (moderation_status = 'approved' AND expires_at > NOW());
CREATE POLICY "Criadores gerenciam próprias stories" ON public.stories FOR ALL USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = stories.creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Usuários gerenciam suas playlists" ON public.playlists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Itens de playlists próprias" ON public.playlist_videos FOR ALL USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_videos.playlist_id AND p.user_id = auth.uid()));
CREATE POLICY "Reações públicas para conteúdo publicado" ON public.video_reactions FOR SELECT USING (TRUE);
CREATE POLICY "Usuários gerenciam próprias reações" ON public.video_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enquetes ativas são públicas" ON public.creator_polls FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Criadores gerenciam próprias enquetes" ON public.creator_polls FOR ALL USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_polls.creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Usuários votam uma vez" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Votos próprios são visíveis" ON public.poll_votes FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Lives aprovadas são públicas" ON public.live_sessions FOR SELECT USING (moderation_status = 'approved' OR public.is_admin());
CREATE POLICY "Criadores gerenciam próprias lives" ON public.live_sessions FOR ALL USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = live_sessions.creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Usuários gerenciam seus pedidos" ON public.creator_requests FOR ALL USING (auth.uid() = requester_id OR EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_requests.creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Usuário vê seus pontos" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário vê seus distintivos" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário gerencia preferências" ON public.content_preferences FOR ALL USING (auth.uid() = user_id);
