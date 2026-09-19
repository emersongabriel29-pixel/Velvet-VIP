-- Velvet VIP: base para checkout real e webhooks idempotentes
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway TEXT NOT NULL,
  gateway_event_id TEXT NOT NULL,
  payment_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','ignored','failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gateway, gateway_event_id)
);

CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('platform_plan','creator_plan','tip','pay_per_view')),
  reference_id UUID,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  gateway TEXT NOT NULL DEFAULT 'mercadopago',
  gateway_preference_id TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','pending','paid','failed','cancelled','refunded')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê seus checkouts" ON public.checkout_sessions
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Usuário cria seus checkouts" ON public.checkout_sessions
FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Administradores veem eventos de pagamento" ON public.payment_events
FOR SELECT USING (public.is_admin());

COMMENT ON TABLE public.payment_events IS 'Idempotência e auditoria: nenhum webhook deve creditar duas vezes';
COMMENT ON TABLE public.checkout_sessions IS 'Intenção de pagamento; receita só é liberada após webhook confirmado';
