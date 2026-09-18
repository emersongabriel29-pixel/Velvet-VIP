import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const allowedOrigins=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean);
const corsFor=(req:Request)=>{const origin=req.headers.get('Origin')||'';return {'Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}};
const json = (req:Request,data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsFor(req), 'Content-Type': 'application/json','Cache-Control':'no-store' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsFor(req) });
  if (req.method !== 'POST') return json(req,{ error: 'Method not allowed' }, 405);
  const supabaseUrl = Deno.env.get('SUPABASE_URL'), serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'), appUrl = Deno.env.get('APP_URL');
  if (!supabaseUrl || !serviceKey || !mpToken || !appUrl) return json(req,{ error: 'Server is not configured' }, 500);
  const auth = req.headers.get('Authorization'); if (!auth?.startsWith('Bearer ')) return json(req,{ error: 'Authentication required' }, 401);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }); const { data: { user }, error: userError } = await admin.auth.getUser(auth.slice(7)); if (userError || !user) return json(req,{ error: 'Invalid session' }, 401);
  const limited = await admin.rpc('consume_rate_limit', { p_bucket: 'payment_preference', p_subject: user.id, p_limit: 10, p_window_seconds: 60 });
  if (limited.error || limited.data !== true) return json(req,{ error: 'Too many requests' }, 429);
  const restriction = await admin.from('account_restrictions').select('id').eq('subject_user_id', user.id).eq('is_active', true).in('scope', ['account','purchase']).lte('starts_at', new Date().toISOString()).or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`).limit(1);
  if (restriction.data?.length) return json(req,{ error: 'Account restricted' }, 403);
  const body = await req.json().catch(() => null), type = body?.type, itemId = body?.item_id;
  if (!['subscription', 'purchase', 'wallet_deposit'].includes(type) || typeof itemId !== 'string') return json(req,{ error: 'Invalid payment request' }, 400);
  let title = '', amount = 0; const reference = `${type}:${itemId}:${user.id}:${crypto.randomUUID()}`;
  if (type === 'purchase') {
    const { data: video } = await admin.from('videos').select('id,title,premium_price,is_premium').eq('id', itemId).single(); if (!video?.is_premium || Number(video.premium_price) <= 0) return json(req,{ error: 'Invalid premium video' }, 400);
    const { data: existing } = await admin.from('purchases').select('id').eq('user_id', user.id).eq('video_id', itemId).eq('status', 'completed').maybeSingle(); if (existing) return json(req,{ error: 'Already purchased' }, 409);
    title = video.title; amount = Number(video.premium_price);
  } else if (type === 'subscription') {
    const { data: plan } = await admin.from('subscription_plans').select('id,name,price').eq('id', itemId).single(); if (!plan || Number(plan.price) <= 0) return json(req,{ error: 'Invalid subscription plan' }, 400);
    title = `${plan.name} - assinatura Velvet VIP`; amount = Number(plan.price);
  } else {
    amount = Number(body.amount); if (!Number.isFinite(amount) || amount < 5 || amount > 5000) return json(req,{ error: 'Invalid deposit amount' }, 400); title = 'Crédito de carteira Velvet VIP';
  }
  const payment = await admin.from('payments').insert({ user_id: user.id, amount, type, status: 'pending', payment_gateway_id: reference }).select('id').single(); if (payment.error || !payment.data) return json(req,{ error: payment.error?.message || 'Could not create payment' }, 500);
  const preference = { items: [{ id: itemId, title, quantity: 1, unit_price: amount, currency_id: 'BRL' }], external_reference: reference, notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`, back_urls: { success: `${appUrl}/payment/success`, failure: `${appUrl}/payment/failure`, pending: `${appUrl}/payment/pending` }, auto_return: 'approved' };
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST', headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(preference) });
  const result = await response.json().catch(() => ({})); if (!response.ok || !result.init_point) { await admin.from('payments').update({ status: 'failed' }).eq('id', payment.data.id); return json(req,{ error: 'Mercado Pago rejected the preference', details: result }, 502); }
  return json(req,{ payment_id: payment.data.id, preference_id: result.id, checkout_url: result.init_point });
});
