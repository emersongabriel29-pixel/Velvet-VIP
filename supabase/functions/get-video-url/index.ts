import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(v => v.trim()).filter(Boolean);
const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') || '';
  const allowed = allowedOrigins.includes(origin) ? origin : '';
  return { 'Access-Control-Allow-Origin': allowed, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
};
const response = (req: Request, data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsFor(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsFor(req) });
  if (req.method !== 'POST') return response(req, { error: 'Method not allowed' }, 405);
  const supabaseUrl = Deno.env.get('SUPABASE_URL'), serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return response(req, { error: 'Server not configured' }, 500);
  const auth = req.headers.get('Authorization'); if (!auth?.startsWith('Bearer ')) return response(req, { error: 'Authentication required' }, 401);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: { user }, error: authError } = await admin.auth.getUser(auth.slice(7)); if (authError || !user) return response(req, { error: 'Invalid session' }, 401);
  const body = await req.json().catch(() => null); const videoId = body?.video_id; if (typeof videoId !== 'string') return response(req, { error: 'video_id required' }, 400);
  const { data: profile } = await admin.from('profiles').select('age_verified,birth_date,is_blocked,is_suspended').eq('id', user.id).single();
  if (!profile?.age_verified || profile.is_blocked || profile.is_suspended || new Date(profile.birth_date) > new Date(new Date().setFullYear(new Date().getFullYear() - 18))) return response(req, { error: '18+ verification required' }, 403);
  const { data: video } = await admin.from('videos').select('id,video_url,is_premium,creator_id,required_tier').eq('id', videoId).single(); if (!video) return response(req, { error: 'Video not found' }, 404);
  if (video.is_premium) {
    const { data: purchase } = await admin.from('purchases').select('id').eq('user_id', user.id).eq('video_id', videoId).eq('status', 'completed').maybeSingle();
    let entitled = Boolean(purchase);
    if (!entitled) {
      const { data: subscription } = await admin.from('subscriptions').select('plan_tier,current_period_end').eq('user_id', user.id).eq('creator_id', video.creator_id).eq('status', 'active').maybeSingle();
      const rank: Record<string, number> = { free: 0, basic: 1, vip: 2, exclusive: 3 }; entitled = Boolean(subscription && new Date(subscription.current_period_end) > new Date() && rank[subscription.plan_tier] >= rank[video.required_tier || 'vip']);
    }
    if (!entitled) return response(req, { error: 'Premium access required' }, 403);
  }
  if (!video.video_url) return response(req, { error: 'Media unavailable' }, 404);
  if (!video.video_url.startsWith('storage://')) return response(req, { error: 'Unmanaged media URL rejected' }, 403);
  const path = video.video_url.slice('storage://'.length);
  const { data, error } = await admin.storage.from('velvet-media').createSignedUrl(path, 120);
  if (error || !data?.signedUrl) return response(req, { error: 'Could not create signed URL' }, 500);
  return response(req, { url: data.signedUrl, expires_in: 120 });
});
