-- Velvet VIP: catálogo, tags e controles de moderação
CREATE TABLE IF NOT EXISTS public.system_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.video_tags (
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.system_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (video_id, tag_id)
);

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (moderation_status IN ('pending','approved','rejected','removed'));
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS identity_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (identity_status IN ('pending','verified','rejected','suspended'));

ALTER TABLE public.system_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorias ativas são públicas" ON public.system_categories
FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Tags ativas são públicas" ON public.system_tags
FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Tags de vídeos publicados são públicas" ON public.video_tags
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.videos v
  WHERE v.id = video_tags.video_id
  AND v.is_draft = FALSE AND v.is_removed = FALSE
  AND v.moderation_status = 'approved'
));
CREATE POLICY "Administradores gerenciam catálogo" ON public.system_categories
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Administradores gerenciam tags" ON public.system_tags
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Criadores gerenciam tags dos próprios vídeos" ON public.video_tags
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.videos v JOIN public.creators c ON c.id = v.creator_id
  WHERE v.id = video_tags.video_id AND c.user_id = auth.uid()
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.videos v JOIN public.creators c ON c.id = v.creator_id
  WHERE v.id = video_tags.video_id AND c.user_id = auth.uid()
));

INSERT INTO public.system_categories (name, slug, description, sort_order) VALUES
('Glamour & Lifestyle','glamour-lifestyle','Estilo, moda e lifestyle adulto',1),
('Ensaio Sensual','ensaio-sensual','Ensaios e nudez artística de adultos',2),
('Solo Especial','solo-especial','Conteúdo solo de adultos',3),
('Casal Adulto','casal-adulto','Conteúdo consensual entre adultos',4),
('LGBTQIA+','lgbtqia','Conteúdo de criadores LGBTQIA+',5),
('Bastidores','bastidores','Bastidores e produção',6),
('Ao Vivo','ao-vivo','Transmissões ao vivo',7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.system_tags (name, slug)
SELECT name, slug FROM (VALUES
('Lingerie','lingerie'),('Preto','preto'),('Português','portugues'),('Árabe','arabe'),
('Amador','amador'),('Anal','anal'),('Bunda','bunda'),('Bunda Grande','bunda-grande'),
('Gay','gay'),('Loira','loira'),('Meias','meias'),('Câmera ao Vivo','camera-ao-vivo'),
('MILF','milf'),('Asiática','asiatica'),('Mulher Sensual','mulher-sensual'),('ASMR','asmr'),
('Coroa','coroa'),('Indiano','indiano'),('BBW','bbw'),('Interracial','interracial'),
('Morena','morena'),('Óleo','oleo'),('Bissexual','bissexual'),('Femdom','femdom'),
('Lésbicas','lesbicas'),('Pau Grande','pau-grande'),('Latina','latina'),('Peitão','peitao'),
('Ruivas','ruivas'),('Solo','solo'),('Squirting','squirting'),('Trans','trans'),
('Pornografia Gay','pornografia-gay'),('Pornografia Trans','pornografia-trans'),
('Sensual','sensual'),('Ensaio','ensaio'),('Sem Nudez','sem-nudez'),('Nudez Artística','nudez-artistica'),
('Bastidores','bastidores'),('Dança','danca'),('Fantasia','fantasia'),('Cosplay','cosplay'),
('Romance','romance'),('Casal Adulto','casal-adulto'),('Tatuagem','tatuagem'),
('Vídeo Curto','video-curto'),('Conteúdo Exclusivo','conteudo-exclusivo'),('Personalizado','personalizado'),
('Todas as Tags','todas-as-tags')
) AS t(name,slug) ON CONFLICT (slug) DO NOTHING;
