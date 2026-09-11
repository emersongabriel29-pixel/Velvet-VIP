import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: true });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!url || !key || !mpToken) return json({ error: 'Webhook não configurado.' }, 503);
  const admin = createClient(url, key);
  const payload = await req.json();
  const paymentId = String(payload.data?.id || payload.id || '');
  if (!paymentId) return json({ ok: true });

  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${mpToken}` } });
  if (!paymentResponse.ok) return json({ error: 'Não foi possível validar o pagamento.' }, 502);
  const payment = await paymentResponse.json();
  const sessionId = payment.external_reference;
  if (!sessionId) return json({ ok: true });

  const { data: session } = await admin.from('checkout_sessions').select('*').eq('id', sessionId).single();
  if (!session) return json({ ok: true });
  const eventType = String(payload.type || 'payment');
  const { error: eventError } = await admin.from('payment_events').insert({
    gateway: 'mercadopago', gateway_event_id: String(paymentId), payment_id: String(paymentId),
    event_type: eventType, status: 'received', payload
  });
  if (eventError?.code === '23505') return json({ ok: true, duplicate: true });
  if (payment.status !== 'approved') {
    await admin.from('checkout_sessions').update({ status: payment.status === 'refunded' ? 'refunded' : 'pending', updated_at: new Date().toISOString() }).eq('id', sessionId);
    return json({ ok: true, status: payment.status });
  }

  await admin.from('checkout_sessions').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', sessionId);
  if (session.kind === 'platform_plan') {
    await admin.from('profiles').update({ platform_plan_id: session.reference_id }).eq('id', session.user_id);
  } else if (session.kind === 'creator_plan') {
    const { data: plan } = await admin.from('creator_plans').select('creator_id,price,tier,billing_period').eq('id', session.reference_id).single();
    if (plan) await admin.from('creator_subscriptions').upsert({
      user_id: session.user_id, creator_id: plan.creator_id, creator_plan_id: session.reference_id,
      status: 'active', amount_paid: plan.price, creator_amount: Number((plan.price * 0.85).toFixed(2)),
      platform_amount: Number((plan.price * 0.15).toFixed(2)), billing_period: plan.billing_period,
      current_period_end: new Date(Date.now() + (plan.billing_period === 'annual' ? 365 : plan.billing_period === 'semiannual' ? 180 : 30) * 86400000).toISOString()
    }, { onConflict: 'user_id,creator_id' });
  } else if (session.kind === 'tip') {
    const creatorId = session.metadata?.creator_id;
    if (creatorId) await admin.from('creator_tips').insert({
      sender_id: session.user_id, creator_id: creatorId, amount: session.amount,
      platform_fee: Number((session.amount * 0.10).toFixed(2)),
      creator_amount: Number((session.amount * 0.90).toFixed(2)),
      message: session.metadata?.message || '', status: 'paid', payment_gateway_id: String(paymentId)
    });
  }
  await admin.from('payment_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('gateway', 'mercadopago').eq('gateway_event_id', String(paymentId));
  return json({ ok: true, status: 'approved' });
});
