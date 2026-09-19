-- Velvet VIP production hardening: KYC, media processing, finance states and observability
-- Apply after 012_admin_creator_analytics.sql.

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS identity_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (identity_status IN ('pending','submitted','under_review','verified','rejected','suspended')),
  ADD COLUMN IF NOT EXISTS identity_provider TEXT,
  ADD COLUMN IF NOT EXISTS identity_reference TEXT,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_rights_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payout_hold_until TIMESTAMPTZ;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'ready'
    CHECK (processing_status IN ('queued','processing','ready','failed')),
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending','reviewing','approved','rejected','removed')),
  ADD COLUMN IF NOT EXISTS moderation_score NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS hls_manifest_path TEXT,
  ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  checkout_session_id UUID REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('subscription','tip','ppv','refund','chargeback','payout')),
  gross_amount NUMERIC(12,2) NOT NULL CHECK (gross_amount >= 0),
  creator_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (creator_amount >= 0),
  platform_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (platform_amount >= 0),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','approved','available','withdrawn','refunded','chargeback','failed')),
  provider TEXT,
  provider_reference TEXT,
  available_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS financial_transactions_provider_ref_idx
  ON public.financial_transactions(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS financial_transactions_creator_date_idx
  ON public.financial_transactions(creator_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.fraud_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('velocity','duplicate_payment','chargeback','account_takeover','multi_account','suspicious_payout')),
  risk_score NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 1),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','cleared','blocked')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.media_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','ready','failed')),
  source_path TEXT NOT NULL,
  hls_manifest_path TEXT,
  thumbnail_path TEXT,
  renditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  access_granted BOOLEAN NOT NULL,
  reason TEXT NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.observability_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','critical')),
  correlation_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS observability_events_date_idx ON public.observability_events(created_at DESC);

CREATE OR REPLACE FUNCTION public.is_creator_owner(p_creator_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.creators WHERE id = p_creator_id AND user_id = auth.uid());
$$;

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observability_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator reads own transactions" ON public.financial_transactions;
CREATE POLICY "creator reads own transactions" ON public.financial_transactions FOR SELECT USING (public.is_creator_owner(creator_id) OR public.is_admin());
DROP POLICY IF EXISTS "admins manage transactions" ON public.financial_transactions;
CREATE POLICY "admins manage transactions" ON public.financial_transactions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins manage fraud signals" ON public.fraud_signals;
CREATE POLICY "admins manage fraud signals" ON public.fraud_signals FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins manage media jobs" ON public.media_processing_jobs;
CREATE POLICY "admins manage media jobs" ON public.media_processing_jobs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "creators read own media jobs" ON public.media_processing_jobs;
CREATE POLICY "creators read own media jobs" ON public.media_processing_jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = media_processing_jobs.video_id AND public.is_creator_owner(v.creator_id))
);
DROP POLICY IF EXISTS "user reads own access logs" ON public.content_access_logs;
CREATE POLICY "user reads own access logs" ON public.content_access_logs FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "admins read observability" ON public.observability_events;
CREATE POLICY "admins read observability" ON public.observability_events FOR SELECT USING (public.is_admin());

DROP TRIGGER IF EXISTS financial_transactions_updated_at ON public.financial_transactions;
CREATE TRIGGER financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS media_processing_jobs_updated_at ON public.media_processing_jobs;
CREATE TRIGGER media_processing_jobs_updated_at BEFORE UPDATE ON public.media_processing_jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
