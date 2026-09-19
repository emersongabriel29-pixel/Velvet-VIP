-- Velvet VIP: classificação de conteúdo e acesso
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS content_level TEXT NOT NULL DEFAULT 'sensual'
  CHECK (content_level IN ('sensual','explicit'));
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'free'
  CHECK (access_type IN ('free','subscription','pay_per_view'));

UPDATE public.videos SET content_level = CASE WHEN is_premium THEN 'explicit' ELSE 'sensual' END;
UPDATE public.videos SET access_type = CASE WHEN is_premium THEN 'subscription' ELSE 'free' END;

-- Conteúdo explícito nunca pode ser publicado como gratuito.
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_free_content_check;
ALTER TABLE public.videos ADD CONSTRAINT videos_free_content_check
  CHECK (content_level = 'sensual' OR is_premium = TRUE OR access_type <> 'free');

COMMENT ON COLUMN public.videos.content_level IS 'sensual = permitido no plano gratuito; explicit = acesso pago e moderação reforçada';
COMMENT ON COLUMN public.videos.access_type IS 'free, subscription ou pay_per_view';
