-- Velvet VIP: denúncias, comentários abusivos e proteção da comunidade
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (moderation_status IN ('pending','approved','hidden','removed'));
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.safety_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('comment','video','creator','profile','message','live_chat')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('hate_speech','racism','threat','harassment','sexual_harassment','non_consensual','underage_suspicion','scam','spam','privacy','copyright','other')),
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','action_taken','dismissed')),
  moderator_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.user_safety_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('warning','comment_restriction','content_removal','temporary_suspension','permanent_ban')),
  reason TEXT NOT NULL,
  report_id UUID REFERENCES public.safety_reports(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.safety_appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.user_safety_actions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','accepted','denied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_safety_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários criam denúncias" ON public.safety_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Usuários veem suas denúncias" ON public.safety_reports FOR SELECT USING (auth.uid() = reporter_id OR public.is_admin());
CREATE POLICY "Administradores tratam denúncias" ON public.safety_reports FOR UPDATE USING (public.is_admin());
CREATE POLICY "Usuário vê suas ações" ON public.user_safety_actions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Administradores gerenciam ações" ON public.user_safety_actions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Usuários gerenciam bloqueios próprios" ON public.user_blocks FOR ALL USING (auth.uid() = blocker_id);
CREATE POLICY "Usuário gerencia seus recursos" ON public.safety_appeals FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Denúncias que envolvem ameaça, racismo, ódio, exploração ou menoridade são urgentes.
CREATE OR REPLACE FUNCTION public.assign_safety_priority()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reason IN ('threat','hate_speech','racism','underage_suspicion','non_consensual') THEN
    NEW.priority := 'urgent';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS safety_report_priority ON public.safety_reports;
CREATE TRIGGER safety_report_priority BEFORE INSERT ON public.safety_reports
FOR EACH ROW EXECUTE FUNCTION public.assign_safety_priority();
