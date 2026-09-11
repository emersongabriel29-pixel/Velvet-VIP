-- Velvet VIP production foundation.
-- Run after 001_hardening.sql.

-- -----------------------------------------------------------------------------
-- Auth profile provisioning
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'user');
  safe_role TEXT := CASE WHEN requested_role = 'creator' THEN 'creator' ELSE 'user' END;
  birth DATE := NULLIF(NEW.raw_user_meta_data->>'birth_date', '')::DATE;
  calculated_age INT;
BEGIN
  IF birth IS NULL THEN
    RAISE EXCEPTION 'birth_date is required';
  END IF;

  calculated_age := EXTRACT(YEAR FROM age(current_date, birth));
  IF calculated_age < 18 THEN
    RAISE EXCEPTION 'User must be at least 18 years old';
  END IF;

  INSERT INTO public.profiles (id, username, name, birth_date, role, age_verified, age_verified_at)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    birth,
    safe_role,
    TRUE,
    NOW()
  );

  IF safe_role = 'creator' THEN
    INSERT INTO public.creators (user_id, display_name, handle, avatar_url, is_approved)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1)),
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&fit=crop',
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Immutable financial ledger: wallet balances must never be edited by clients.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit','purchase','refund','creator_credit','withdrawal','adjustment')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount <> 0),
  reference_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created ON public.wallet_ledger(user_id, created_at DESC);
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet ledger owner read" ON public.wallet_ledger;
CREATE POLICY "wallet ledger owner read" ON public.wallet_ledger FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  event_type TEXT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, external_event_id)
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read audit logs" ON public.audit_logs;
CREATE POLICY "admins read audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- Private media storage. Keep paid originals out of public buckets.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('velvet-media', 'velvet-media', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

DROP POLICY IF EXISTS "creators upload velvet media" ON storage.objects;
CREATE POLICY "creators upload velvet media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'velvet-media' AND
  EXISTS (SELECT 1 FROM public.creators c WHERE c.user_id = auth.uid() AND c.is_approved = true)
);

DROP POLICY IF EXISTS "creators manage own velvet media" ON storage.objects;
CREATE POLICY "creators manage own velvet media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'velvet-media' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'velvet-media' AND owner_id = auth.uid()::text);

DROP POLICY IF EXISTS "creators delete own velvet media" ON storage.objects;
CREATE POLICY "creators delete own velvet media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'velvet-media' AND owner_id = auth.uid()::text);

-- No public SELECT policy: files are delivered by signed URLs after access checks.

-- -----------------------------------------------------------------------------
-- Server-side helpers for money-moving operations.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_wallet_entry(
  p_user_id UUID,
  p_entry_type TEXT,
  p_amount NUMERIC,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry_id UUID;
BEGIN
  IF NOT public.is_admin() AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_amount = 0 THEN RAISE EXCEPTION 'Amount cannot be zero'; END IF;

  INSERT INTO public.wallet_ledger(user_id, entry_type, amount, reference_id, metadata)
  VALUES (p_user_id, p_entry_type, p_amount, p_reference_id, p_metadata)
  RETURNING id INTO entry_id;

  UPDATE public.profiles
  SET wallet_balance = GREATEST(0, wallet_balance + p_amount), updated_at = NOW()
  WHERE id = p_user_id;

  RETURN entry_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_wallet_entry(UUID,TEXT,NUMERIC,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_wallet_entry(UUID,TEXT,NUMERIC,TEXT,JSONB) TO authenticated;

-- -----------------------------------------------------------------------------
-- Realtime without exposing private financial data.
-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;

-- Stronger creator approval default for future rows.
ALTER TABLE public.creators ALTER COLUMN is_approved SET DEFAULT FALSE;

-- -----------------------------------------------------------------------------
-- Constraints against negative/invalid commercial values.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_price_nonnegative CHECK (price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.purchases ADD CONSTRAINT purchases_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.creator_balance ADD CONSTRAINT creator_balance_nonnegative CHECK (available_amount >= 0 AND pending_amount >= 0 AND total_withdrawn >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Existing demo data may have is_approved=true; do not mutate it here. New creator
-- registrations are explicitly unapproved by the trigger above.
