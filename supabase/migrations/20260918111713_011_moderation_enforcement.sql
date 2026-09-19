-- Velvet VIP: enforcement server-side de classificação e revisão
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ai_moderation_label TEXT CHECK (ai_moderation_label IN ('sensual','explicit','uncertain'));
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ai_moderation_confidence NUMERIC(5,4) CHECK (ai_moderation_confidence IS NULL OR (ai_moderation_confidence >= 0 AND ai_moderation_confidence <= 1));
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS moderation_review_reason TEXT;

CREATE OR REPLACE FUNCTION public.enforce_video_moderation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.content_level = 'explicit' AND NEW.access_type = 'free' THEN
    RAISE EXCEPTION 'Conteúdo explícito não pode ser gratuito';
  END IF;

  IF NEW.ai_moderation_label = 'explicit' AND NEW.access_type = 'free' THEN
    RAISE EXCEPTION 'A classificação automática impede conteúdo explícito gratuito';
  END IF;

  IF NEW.ai_moderation_label = 'uncertain' OR (
    NEW.ai_moderation_confidence IS NOT NULL AND NEW.ai_moderation_confidence < 0.85
  ) THEN
    NEW.moderation_status := 'pending';
    NEW.moderation_review_reason := COALESCE(NEW.moderation_review_reason, 'Revisão humana obrigatória por baixa confiança');
  END IF;

  IF TG_OP = 'INSERT' AND NEW.is_draft = FALSE THEN
    NEW.moderation_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_video_moderation ON public.videos;
CREATE TRIGGER enforce_video_moderation
BEFORE INSERT OR UPDATE OF content_level, access_type, ai_moderation_label, ai_moderation_confidence, is_draft
ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.enforce_video_moderation();

COMMENT ON COLUMN public.videos.ai_moderation_label IS 'Resultado do classificador; uncertain exige análise humana';
COMMENT ON COLUMN public.videos.ai_moderation_confidence IS 'Confiança do classificador entre 0 e 1; abaixo de 0.85 vai para revisão';
