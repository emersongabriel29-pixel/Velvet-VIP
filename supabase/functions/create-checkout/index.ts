import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean);
const corsFor=(req:Request)=>{const origin=req.headers.get('Origin')||'';return {'Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};};
const json = (req:Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsFor(req), 'Content-Type': 'application/json', 'Cache-Control':'no-store' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsFor(req) });
  if (req.method !== 'POST') return json(req,{ error: 'Método não permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!supabaseUrl || !anonKey || !serviceKey || !mpToken) return json(req,{ error: 'Checkout não configurado no servidor.' }, 503);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json(req,{ error: 'Autenticação obrigatória.' }, 401);
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json(req,{ error: 'Sessão inválida.' }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const limited = await admin.rpc('consume_rate_limit', { p_bucket: 'legacy_checkout', p_subject: user.id, p_limit: 10, p_window_seconds: 60 });
  if (limited.error || limited.data !== true) return json(req,{ error: 'Muitas tentativas. Tente novamente em instantes.' }, 429);
  const now = new Date().toISOString();
  const restriction = await admin.from('account_restrictions').select('id').eq('subject_user_id', user.id).eq('is_active', true).in('scope', ['account','purchase']).lte('starts_at', now).or(`ends_at.is.null,ends_at.gt.${now}`).limit(1);
  if (restriction.data?.length) return json(req,{ error: 'Conta temporariamente impedida de realizar compras.' }, 403);
  const body = await req.json();
  const kind = body.kind;
  let amount = 0;
  let description = '';
  let referenceId: string | null = null;
  const metadata: Record<string, unknown> = { kind };

  if (kind === 'platform_plan' && body.planId) {
    const { data: plan } = await admin.from('platform_plans').select('id,name,monthly_price,is_active').eq('id', body.planId).single();
    if (!plan?.is_active || Number(plan.monthly_price) <= 0) return json(req,{ error: 'Plano inválido.' }, 400);
    amount = Number(plan.monthly_price);
    description = `Velvet VIP ${plan.name}`;
    referenceId = plan.id;
  } else if (kind === 'creator_plan' && body.planId) {
    const { data: plan } = await admin.from('creator_plans').select('id,name,price,is_active,creator_id').eq('id', body.planId).single();
    if (!plan?.is_active) return json(req,{ error: 'Plano do criador inválido.' }, 400);
    amount = Number(plan.price);
    description = `Assinatura ${plan.name}`;
    referenceId = plan.id;
    metadata.creator_id = plan.creator_id;
  } else if (kind === 'tip' && body.creatorId) {
    amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 9999) return json(req,{ error: 'Valor de gorjeta inválido.' }, 400);
    description = 'Gorjeta para criador Velvet VIP';
    referenceId = body.creatorId;
    metadata.message = String(body.message || '').slice(0, 500);
    metadata.creator_id = body.creatorId;
  } else {
    return json(req,{ error: 'Dados de checkout incompletos.' }, 400);
  }

  const { data: session, error: sessionError } = await admin.from('checkout_sessions').insert({
    user_id: user.id, kind, reference_id: referenceId, amount, metadata
  }).select('id').single();
  if (sessionError || !session) return json(req,{ error: 'Não foi possível criar a sessão.' }, 500);

  const origin = Deno.env.get('PUBLIC_APP_URL') || 'https://velvet-vip.app';
  const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ title: description, quantity: 1, currency_id: 'BRL', unit_price: amount }],
      external_reference: session.id,
      notification_url: `${supabaseUrl}/functions/v1/payment-webhook`,
      back_urls: { success: `${origin}/?payment=success`, failure: `${origin}/?payment=failure`, pending: `${origin}/?payment=pending` },
      auto_return: 'approved'
    })
  });
  if (!mpResponse.ok) {
    await admin.from('checkout_sessions').update({ status: 'failed' }).eq('id', session.id);
    return json(req,{ error: 'Gateway recusou o checkout.' }, 502);
  }
  const preference = await mpResponse.json();
  await admin.from('checkout_sessions').update({ gateway_preference_id: preference.id }).eq('id', session.id);
  return json(req,{ checkoutUrl: preference.init_point });
});
