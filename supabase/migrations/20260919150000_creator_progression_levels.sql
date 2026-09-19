-- Creator progression and discovery ranking
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS level_score numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS feed_boost numeric(8,3) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS level_highlights_limit integer NOT NULL DEFAULT 3;

CREATE TABLE IF NOT EXISTS public.creator_level_rules (
  level integer PRIMARY KEY CHECK (level BETWEEN 1 AND 5),
  min_score numeric(12,2) NOT NULL,
  feed_boost numeric(8,3) NOT NULL,
  highlights_limit integer NOT NULL,
  badge_label text NOT NULL
);
INSERT INTO public.creator_level_rules(level,min_score,feed_boost,highlights_limit,badge_label) VALUES
(1,0,1.00,3,'Novo criador'),
(2,100,1.15,5,'Criador em crescimento'),
(3,300,1.35,8,'Criador destaque'),
(4,700,1.65,12,'Criador premium'),
(5,1400,2.00,20,'Criador estrela')
ON CONFLICT(level) DO UPDATE SET min_score=excluded.min_score,feed_boost=excluded.feed_boost,highlights_limit=excluded.highlights_limit,badge_label=excluded.badge_label;

ALTER TABLE public.creator_level_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "creator_level_rules_public_read" ON public.creator_level_rules;
CREATE POLICY "creator_level_rules_public_read" ON public.creator_level_rules FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.refresh_creator_level(p_creator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_followers numeric := 0;
  v_likes numeric := 0;
  v_comments numeric := 0;
  v_live_minutes numeric := 0;
  v_tips numeric := 0;
  v_sales numeric := 0;
  v_views numeric := 0;
  v_score numeric := 0;
  v_level integer := 1;
  v_boost numeric := 1;
  v_highlights integer := 3;
BEGIN
  SELECT COALESCE(total_followers,0),COALESCE(total_likes,0),COALESCE(total_views,0)
    INTO v_followers,v_likes,v_views FROM public.creators WHERE id=p_creator_id;
  SELECT COUNT(*) INTO v_comments FROM public.comments c JOIN public.videos v ON v.id=c.video_id WHERE v.creator_id=p_creator_id;
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at,now())-started_at))/60),0)
    INTO v_live_minutes FROM public.live_sessions WHERE creator_id=p_creator_id AND status IN ('live','ended');
  SELECT COALESCE(SUM(amount),0) INTO v_tips FROM public.creator_tips WHERE creator_id=p_creator_id AND status='paid';
  SELECT COUNT(*) INTO v_sales FROM public.purchases WHERE creator_id=p_creator_id AND status='completed';

  v_score :=
      LEAST(v_followers*2,300)
    + LEAST(v_likes*0.25,250)
    + LEAST(v_comments*2,250)
    + LEAST(v_live_minutes*0.50,200)
    + LEAST(v_tips*1.00,400)
    + LEAST(v_sales*5,400)
    + LEAST(v_views*0.02,200);

  SELECT r.level,r.feed_boost,r.highlights_limit
    INTO v_level,v_boost,v_highlights
    FROM public.creator_level_rules r
    WHERE r.min_score <= v_score
    ORDER BY r.level DESC LIMIT 1;

  UPDATE public.creators
  SET level=v_level,level_score=round(v_score,2),level_updated_at=now(),
      feed_boost=v_boost,level_highlights_limit=v_highlights
  WHERE id=p_creator_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_creator_level(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_creator_level_from_video()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ BEGIN PERFORM public.refresh_creator_level(COALESCE(NEW.creator_id,OLD.creator_id)); RETURN COALESCE(NEW,OLD); END $$;
CREATE OR REPLACE FUNCTION public.refresh_creator_level_from_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE v_creator uuid; BEGIN SELECT creator_id INTO v_creator FROM public.videos WHERE id=COALESCE(NEW.video_id,OLD.video_id); IF v_creator IS NOT NULL THEN PERFORM public.refresh_creator_level(v_creator); END IF; RETURN COALESCE(NEW,OLD); END $$;
CREATE OR REPLACE FUNCTION public.refresh_creator_level_from_tip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ BEGIN PERFORM public.refresh_creator_level(COALESCE(NEW.creator_id,OLD.creator_id)); RETURN COALESCE(NEW,OLD); END $$;
CREATE OR REPLACE FUNCTION public.refresh_creator_level_from_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ BEGIN PERFORM public.refresh_creator_level(COALESCE(NEW.creator_id,OLD.creator_id)); RETURN COALESCE(NEW,OLD); END $$;
CREATE OR REPLACE FUNCTION public.refresh_creator_level_from_live()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ BEGIN PERFORM public.refresh_creator_level(COALESCE(NEW.creator_id,OLD.creator_id)); RETURN COALESCE(NEW,OLD); END $$;

DROP TRIGGER IF EXISTS trg_creator_level_video ON public.videos;
CREATE TRIGGER trg_creator_level_video AFTER INSERT OR UPDATE OR DELETE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.refresh_creator_level_from_video();
DROP TRIGGER IF EXISTS trg_creator_level_comment ON public.comments;
CREATE TRIGGER trg_creator_level_comment AFTER INSERT OR UPDATE OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.refresh_creator_level_from_comment();
DROP TRIGGER IF EXISTS trg_creator_level_tip ON public.creator_tips;
CREATE TRIGGER trg_creator_level_tip AFTER INSERT OR UPDATE OR DELETE ON public.creator_tips FOR EACH ROW EXECUTE FUNCTION public.refresh_creator_level_from_tip();
DROP TRIGGER IF EXISTS trg_creator_level_purchase ON public.purchases;
CREATE TRIGGER trg_creator_level_purchase AFTER INSERT OR UPDATE OR DELETE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.refresh_creator_level_from_purchase();
DROP TRIGGER IF EXISTS trg_creator_level_live ON public.live_sessions;
CREATE TRIGGER trg_creator_level_live AFTER INSERT OR UPDATE OR DELETE ON public.live_sessions FOR EACH ROW EXECUTE FUNCTION public.refresh_creator_level_from_live();

CREATE INDEX IF NOT EXISTS creators_level_feed_idx ON public.creators(level DESC,level_score DESC,feed_boost DESC,created_at DESC);

-- Backfill existing approved creators once.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.creators WHERE is_approved=TRUE LOOP
    PERFORM public.refresh_creator_level(r.id);
  END LOOP;
END $$;
