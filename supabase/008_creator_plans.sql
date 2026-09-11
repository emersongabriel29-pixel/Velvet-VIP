-- Velvet VIP: planos configuráveis por criador
CREATE TABLE IF NOT EXISTS public.creator_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic','vip','exclusive')),
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','semiannual','annual')),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 4.90 AND price <= 999.90),
  platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
  creator_share_percent NUMERIC(5,2) NOT NULL DEFAULT 85.00 CHECK (creator_share_percent >= 0 AND creator_share_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ROUND(platform_fee_percent + creator_share_percent, 2) = 100.00),
  UNIQUE(creator_id, tier, billing_period)
);

ALTER TABLE public.creator_subscriptions ADD COLUMN IF NOT EXISTS creator_plan_id UUID REFERENCES public.creator_plans(id);
ALTER TABLE public.creator_subscriptions ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2);
ALTER TABLE public.creator_subscriptions ADD COLUMN IF NOT EXISTS creator_amount NUMERIC(10,2);
ALTER TABLE public.creator_subscriptions ADD COLUMN IF NOT EXISTS platform_amount NUMERIC(10,2);
ALTER TABLE public.creator_subscriptions ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';

ALTER TABLE public.creator_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Planos ativos de criadores são públicos" ON public.creator_plans
FOR SELECT USING (is_active = TRUE OR EXISTS (
  SELECT 1 FROM public.creators c WHERE c.id = creator_plans.creator_id AND c.user_id = auth.uid()
) OR public.is_admin());
CREATE POLICY "Criadores gerenciam seus planos" ON public.creator_plans
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.creators c WHERE c.id = creator_plans.creator_id AND c.user_id = auth.uid()
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.creators c WHERE c.id = creator_plans.creator_id AND c.user_id = auth.uid()
));

COMMENT ON TABLE public.creator_plans IS 'Assinaturas de cada criador; não se confundem com planos gerais da plataforma';
COMMENT ON COLUMN public.creator_plans.price IS 'Preço final escolhido pelo criador para o período';
COMMENT ON COLUMN public.creator_plans.creator_share_percent IS 'Percentual do criador somente sobre receita confirmada';
