-- Velvet VIP: progressão, indicações e benefícios
CREATE TABLE IF NOT EXISTS public.referral_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  clicks INT NOT NULL DEFAULT 0,
  qualified_signups INT NOT NULL DEFAULT 0,
  qualified_conversions INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referral_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_link_id UUID NOT NULL REFERENCES public.referral_links(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('click','signup','paid_conversion')),
  reward_granted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referral_link_id, referred_user_id, event_type)
);

CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  free_unlocks INT NOT NULL DEFAULT 0 CHECK (free_unlocks >= 0),
  total_watch_minutes INT NOT NULL DEFAULT 0,
  total_shares INT NOT NULL DEFAULT 0,
  total_paid_conversions INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_progress (
  creator_id UUID PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  verified_badge BOOLEAN NOT NULL DEFAULT FALSE,
  featured_eligibility BOOLEAN NOT NULL DEFAULT FALSE,
  total_paid_subscribers INT NOT NULL DEFAULT 0,
  total_paid_sales INT NOT NULL DEFAULT 0,
  total_watch_minutes BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.progress_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  reward_label TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CHECK ((user_id IS NOT NULL) <> (creator_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.content_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('purchase','creator_subscription','referral_reward','gift')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE TABLE IF NOT EXISTS public.creator_subscriptions (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, creator_id)
);

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS creator_only BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS referral_unlock_level INT CHECK (referral_unlock_level IS NULL OR referral_unlock_level >= 1);

ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus links" ON public.referral_links FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários veem seus eventos" ON public.referral_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.referral_links l WHERE l.id = referral_link_id AND l.user_id = auth.uid()));
CREATE POLICY "Usuários veem seu progresso" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criadores veem seu progresso" ON public.creator_progress FOR SELECT USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_progress.creator_id AND c.user_id = auth.uid()) OR public.is_admin());
CREATE POLICY "Usuários veem suas recompensas" ON public.progress_rewards FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.creators c WHERE c.id = progress_rewards.creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Usuários gerenciam seus desbloqueios" ON public.content_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários veem suas assinaturas de criadores" ON public.creator_subscriptions FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_subscriptions.creator_id AND c.user_id = auth.uid()));

INSERT INTO public.platform_plans (name, slug, monthly_price, ads_enabled, benefits) VALUES
('Grátis','gratis',0,TRUE,'["Conteúdo sensual gratuito","Anúncios","Recompensas por compartilhamento"]'::jsonb),
('Plus','plus',19.90,FALSE,'["Sem anúncios","Acesso geral à plataforma","Filtros avançados"]'::jsonb),
('VIP','vip',39.90,FALSE,'["Sem anúncios","Acesso geral","Acesso antecipado","Benefícios VIP"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET benefits = EXCLUDED.benefits, ads_enabled = EXCLUDED.ads_enabled;
