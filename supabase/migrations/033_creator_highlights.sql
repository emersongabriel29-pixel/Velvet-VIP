-- Creator profile highlights (stories/destaques)
CREATE TABLE IF NOT EXISTS public.creator_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 40),
  cover_url TEXT,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_highlights_creator_order_idx ON public.creator_highlights(creator_id, sort_order, created_at DESC);
ALTER TABLE public.creator_highlights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "highlights_public_read" ON public.creator_highlights;
CREATE POLICY "highlights_public_read" ON public.creator_highlights FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "highlights_creator_insert" ON public.creator_highlights;
CREATE POLICY "highlights_creator_insert" ON public.creator_highlights FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id=creator_id AND c.user_id=auth.uid() AND c.is_approved=TRUE));
DROP POLICY IF EXISTS "highlights_creator_update" ON public.creator_highlights;
CREATE POLICY "highlights_creator_update" ON public.creator_highlights FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id=creator_id AND c.user_id=auth.uid() AND c.is_approved=TRUE)) WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id=creator_id AND c.user_id=auth.uid() AND c.is_approved=TRUE));
DROP POLICY IF EXISTS "highlights_creator_delete" ON public.creator_highlights;
CREATE POLICY "highlights_creator_delete" ON public.creator_highlights FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id=creator_id AND c.user_id=auth.uid() AND c.is_approved=TRUE));
