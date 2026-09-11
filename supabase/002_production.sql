-- Velvet VIP production foundation. Run after 001_hardening.sql.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested_role TEXT := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'user');
  safe_role TEXT := CASE WHEN requested_role = 'creator' THEN 'creator' ELSE 'user' END;
  birth DATE := NULLIF(NEW.raw_user_meta_data->>'birth_date', '')::DATE;
BEGIN
  IF birth IS NULL OR EXTRACT(YEAR FROM age(current_date, birth)) < 18 THEN
    RAISE EXCEPTION 'User must be at least 18 years old';
  END IF;
  INSERT INTO public.profiles (id, username, name, birth_date, role, age_verified, age_verified_at)
  VALUES (NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    birth, safe_role, TRUE, NOW());
  IF safe_role = 'creator' THEN
    INSERT INTO public.creators (user_id, display_name, handle, avatar_url, is_approved)
    VALUES (NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1)),
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&fit=crop', FALSE);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit','purchase','refund','creator_credit','withdrawal','adjustment')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount <> 0), reference_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created ON public.wallet_ledger(user_id, created_at DESC);
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet ledger owner read" ON public.wallet_ledger;
CREATE POLICY "wallet ledger owner read" ON public.wallet_ledger FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), provider TEXT NOT NULL, external_event_id TEXT NOT NULL,
  event_type TEXT, payload JSONB NOT NULL, processed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, external_event_id));
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, target_type TEXT, target_id UUID, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read audit logs" ON public.audit_logs;
CREATE POLICY "admins read audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());

INSERT INTO storage.buckets (id, name, public) VALUES ('velvet-media', 'velvet-media', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;
DROP POLICY IF EXISTS "creators upload velvet media" ON storage.objects;
CREATE POLICY "creators upload velvet media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'velvet-media' AND EXISTS (SELECT 1 FROM public.creators c WHERE c.user_id = auth.uid() AND c.is_approved = true));
DROP POLICY IF EXISTS "creators manage own velvet media" ON storage.objects;
CREATE POLICY "creators manage own velvet media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'velvet-media' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'velvet-media' AND owner_id = auth.uid()::text);
DROP POLICY IF EXISTS "creators delete own velvet media" ON storage.objects;
CREATE POLICY "creators delete own velvet media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'velvet-media' AND owner_id = auth.uid()::text);

-- Only trusted server code (service role / SECURITY DEFINER backend) may move money.
CREATE OR REPLACE FUNCTION public.record_wallet_entry(
  p_user_id UUID, p_entry_type TEXT, p_amount NUMERIC, p_reference_id TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE entry_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Server-only operation'; END IF;
  IF p_amount = 0 THEN RAISE EXCEPTION 'Amount cannot be zero'; END IF;
  INSERT INTO public.wallet_ledger(user_id, entry_type, amount, reference_id, metadata)
  VALUES (p_user_id, p_entry_type, p_amount, p_reference_id, p_metadata) RETURNING id INTO entry_id;
  UPDATE public.profiles SET wallet_balance = wallet_balance + p_amount, updated_at = NOW() WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN entry_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_wallet_entry(UUID,TEXT,NUMERIC,TEXT,JSONB) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.credit_creator(
  p_creator_id UUID, p_gross NUMERIC, p_reference_id TEXT, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE creator_user UUID; creator_entry UUID; share NUMERIC := 0.85; net NUMERIC;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Server-only operation'; END IF;
  IF p_gross <= 0 THEN RAISE EXCEPTION 'Gross must be positive'; END IF;
  SELECT user_id INTO creator_user FROM public.creators WHERE id = p_creator_id AND is_approved = true;
  IF creator_user IS NULL THEN RAISE EXCEPTION 'Creator not found or not approved'; END IF;
  net := round(p_gross * share, 2);
  INSERT INTO public.wallet_ledger(user_id, entry_type, amount, reference_id, metadata)
  VALUES (creator_user, 'creator_credit', net, p_reference_id, p_metadata) RETURNING id INTO creator_entry;
  UPDATE public.profiles SET wallet_balance = wallet_balance + net, updated_at = NOW() WHERE id = creator_user;
  UPDATE public.creators SET gross_earnings = gross_earnings + p_gross, available_balance = available_balance + net, updated_at = NOW() WHERE id = p_creator_id;
  INSERT INTO public.creator_balance(creator_id, available_amount, pending_amount, total_withdrawn)
  VALUES (p_creator_id, net, 0, 0)
  ON CONFLICT (creator_id) DO UPDATE SET available_amount = public.creator_balance.available_amount + net, updated_at = NOW();
  RETURN creator_entry;
END; $$;
REVOKE ALL ON FUNCTION public.credit_creator(UUID,NUMERIC,TEXT,JSONB) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.creators ALTER COLUMN is_approved SET DEFAULT FALSE;

DO $$ BEGIN ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_price_nonnegative CHECK (price >= 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_amount_positive CHECK (amount > 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.purchases ADD CONSTRAINT purchases_amount_positive CHECK (amount > 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.creator_balance ADD CONSTRAINT creator_balance_nonnegative CHECK (available_amount >= 0 AND pending_amount >= 0 AND total_withdrawn >= 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
