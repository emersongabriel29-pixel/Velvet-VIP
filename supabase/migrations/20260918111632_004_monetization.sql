-- Velvet VIP: monetização, gorjetas, planos e publicidade
CREATE TABLE IF NOT EXISTS public.platform_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  ads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  creator_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','cancelled')),
  payment_gateway_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  advertiser_name TEXT NOT NULL,
  creative_url TEXT,
  target_url TEXT,
  placement TEXT NOT NULL DEFAULT 'feed' CHECK (placement IN ('feed','explore','banner')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','finished')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_plan_id UUID REFERENCES public.platform_plans(id);
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS subscription_share_percent NUMERIC(5,2) NOT NULL DEFAULT 85.00;
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS tip_share_percent NUMERIC(5,2) NOT NULL DEFAULT 90.00;

ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos ativos são públicos" ON public.platform_plans
FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Usuário vê suas gorjetas enviadas" ON public.creator_tips
FOR SELECT USING (auth.uid() = sender_id OR EXISTS (
  SELECT 1 FROM public.creators c WHERE c.id = creator_tips.creator_id AND c.user_id = auth.uid()
) OR public.is_admin());
CREATE POLICY "Usuário cria suas gorjetas" ON public.creator_tips
FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Anúncios ativos são públicos" ON public.ad_campaigns
FOR SELECT USING (status = 'active' OR public.is_admin());
CREATE POLICY "Administradores gerenciam planos" ON public.platform_plans
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Administradores gerenciam anúncios" ON public.ad_campaigns
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.platform_plans (name, slug, monthly_price, ads_enabled, benefits) VALUES
('Grátis','gratis',0,TRUE,'["Acesso ao feed","Limite de favoritos","Anúncios no feed"]'::jsonb),
('Plus','plus',19.90,FALSE,'["Sem anúncios","Mais favoritos","Filtros avançados","Suporte prioritário"]'::jsonb),
('VIP','vip',39.90,FALSE,'["Sem anúncios","Acesso antecipado","Descontos em conteúdos","Gorjetas destacadas"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;
