-- Rebalance creator progression: paid lives and sales carry more weight.
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
  v_free_live_minutes numeric := 0;
  v_paid_live_minutes numeric := 0;
  v_tips numeric := 0;
  v_sales numeric := 0;
  v_views numeric := 0;
  v_score numeric := 0;
  v_level integer := 1;
  v_boost numeric := 1;
  v_highlights integer := 3;
BEGIN
  SELECT COALESCE(total_followers,0),COALESCE(total_likes,0),COALESCE(total_views,0)
    INTO v_followers,v_likes,v_views
  FROM public.creators WHERE id=p_creator_id;

  SELECT COUNT(*) INTO v_comments
  FROM public.comments c
  JOIN public.videos v ON v.id=c.video_id
  WHERE v.creator_id=p_creator_id;

  SELECT
    COALESCE(SUM(CASE WHEN required_plan='free' THEN EXTRACT(EPOCH FROM (COALESCE(ended_at,now())-started_at))/60 ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN required_plan IN ('plus','vip') THEN EXTRACT(EPOCH FROM (COALESCE(ended_at,now())-started_at))/60 ELSE 0 END),0)
  INTO v_free_live_minutes,v_paid_live_minutes
  FROM public.live_sessions
  WHERE creator_id=p_creator_id AND status IN ('live','ended');

  SELECT COALESCE(SUM(amount),0)
    INTO v_tips
  FROM public.creator_tips
  WHERE creator_id=p_creator_id AND status='paid';

  SELECT COUNT(*)
    INTO v_sales
  FROM public.purchases
  WHERE creator_id=p_creator_id AND status='completed';

  v_score :=
      LEAST(v_followers*2,300)
    + LEAST(v_likes*0.25,250)
    + LEAST(v_comments*2,250)
    + LEAST(v_free_live_minutes*0.25,100)
    + LEAST(v_paid_live_minutes*1.00,400)
    + LEAST(v_tips*1.00,400)
    + LEAST(v_sales*15,1000)
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

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.creators WHERE is_approved=TRUE LOOP
    PERFORM public.refresh_creator_level(r.id);
  END LOOP;
END $$;
