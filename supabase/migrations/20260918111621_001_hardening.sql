-- Velvet VIP production hardening migration.
-- Run AFTER supabase/schema.sql.

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_blocked = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_age_verified()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND age_verified = true
      AND birth_date <= (CURRENT_DATE - INTERVAL '18 years')::date
      AND is_blocked = false
      AND is_suspended = false
  );
$$;

-- -----------------------------------------------------------------------------
-- Protect server-controlled profile fields from client-side tampering.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.id AND NOT public.is_admin() THEN
    NEW.id := OLD.id;
    NEW.role := OLD.role;
    NEW.wallet_balance := OLD.wallet_balance;
    NEW.age_verified := OLD.age_verified;
    NEW.age_verified_at := OLD.age_verified_at;
    NEW.is_blocked := OLD.is_blocked;
    NEW.is_suspended := OLD.is_suspended;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

CREATE OR REPLACE FUNCTION public.protect_creator_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.gross_earnings := OLD.gross_earnings;
    NEW.available_balance := OLD.available_balance;
    NEW.total_followers := OLD.total_followers;
    NEW.total_likes := OLD.total_likes;
    NEW.total_views := OLD.total_views;
    NEW.verified := OLD.verified;
    NEW.is_approved := OLD.is_approved;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_creator_financial_fields ON public.creators;
CREATE TRIGGER protect_creator_financial_fields
BEFORE UPDATE ON public.creators
FOR EACH ROW EXECUTE FUNCTION public.protect_creator_financial_fields();

-- -----------------------------------------------------------------------------
-- Replace overly permissive policies.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Perfis são públicos para leitura" ON public.profiles;
DROP POLICY IF EXISTS "Usuários atualizam próprio perfil" ON public.profiles;
CREATE POLICY "Usuário lê o próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Usuário edita o próprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Criador atualiza suas configurações" ON public.creators;
CREATE POLICY "Criador edita dados não financeiros" ON public.creators
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Adult content must never be available to anonymous/unverified users.
DROP POLICY IF EXISTS "Vídeos públicos publicados são visíveis para usuários verificados" ON public.videos;
CREATE POLICY "Conteúdo publicado exige maioridade verificada" ON public.videos
  FOR SELECT USING (
    public.is_age_verified()
    AND (
      (is_draft = false AND is_removed = false)
      OR EXISTS (
        SELECT 1 FROM public.creators
        WHERE creators.id = videos.creator_id
          AND creators.user_id = auth.uid()
      )
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Criadores podem editar seus próprios vídeos" ON public.videos;
CREATE POLICY "Criador edita seus próprios vídeos" ON public.videos
  FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = videos.creator_id AND creators.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = videos.creator_id AND creators.user_id = auth.uid()
    )
  );

-- Admin-only moderation/report access.
CREATE POLICY "Usuário cria denúncia" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Usuário vê suas denúncias" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id OR public.is_admin());
CREATE POLICY "Admin gerencia denúncias" ON public.reports
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Payments are immutable application records; clients may only read their own.
CREATE POLICY "Usuário vê seus pagamentos" ON public.payments
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Subscription and purchase writes must happen through a trusted backend/webhook.
DROP POLICY IF EXISTS "Usuários acessam suas assinaturas" ON public.subscriptions;
CREATE POLICY "Usuário vê suas assinaturas" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Usuários acessam suas compras" ON public.purchases;
CREATE POLICY "Usuário vê suas compras" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Never let a browser insert/update arbitrary withdrawal amounts or statuses.
DROP POLICY IF EXISTS "Criadores gerenciam seus saques" ON public.withdrawals;
CREATE POLICY "Criador vê seus saques" ON public.withdrawals
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = withdrawals.creator_id AND creators.user_id = auth.uid()
    )
  );
CREATE POLICY "Admin gerencia saques" ON public.withdrawals
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Notifications: users can read/update their own; inserts are server-side.
DROP POLICY IF EXISTS "Usuários acessam apenas suas notificações" ON public.notifications;
CREATE POLICY "Usuário lê suas notificações" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Usuário marca suas notificações" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- -----------------------------------------------------------------------------
-- Useful public-safe profile view. Do not expose email/birth date through it.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, username, name, avatar_url, bio, role, created_at
FROM public.profiles
WHERE is_blocked = false AND is_suspended = false;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Keep updated_at consistent.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_videos_updated_at ON public.videos;
CREATE TRIGGER touch_videos_updated_at BEFORE UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Basic data validation.
-- -----------------------------------------------------------------------------
ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_premium_price_nonnegative;
ALTER TABLE public.videos
  ADD CONSTRAINT videos_premium_price_nonnegative CHECK (premium_price >= 0);

ALTER TABLE public.withdrawals
  DROP CONSTRAINT IF EXISTS withdrawals_amount_positive;
ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_amount_positive CHECK (amount > 0 AND fee >= 0 AND net_amount >= 0);

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_amount_positive;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
