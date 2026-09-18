import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function hmac(secret: string, message: string) { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))); }
function timingSafeEqual(a: string, b: string) { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET'), supabaseUrl = Deno.env.get('SUPABASE_URL'), serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!secret || !supabaseUrl || !serviceKey || !mpToken) return new Response('Server not configured', { status: 500 });
  const signature = req.headers.get('x-signature') || '', requestId = req.headers.get('x-request-id') || '', url = new URL(req.url), dataId = url.searchParams.get('data.id') || '';
  const parts = Object.fromEntries(signature.split(',').map(p => p.split('=', 2).map(s => s.trim())).filter(p => p.length === 2));
  const ts = Number(parts.ts || 0);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return new Response('Stale signature', { status: 401 });
  const manifestParts = [`id:${dataId}`]; if (requestId) manifestParts.push(`request-id:${requestId}`); if (parts.ts) manifestParts.push(`ts:${parts.ts}`);
  const expected = await hmac(secret, `${manifestParts.join(';')};`); if (!parts.v1 || !timingSafeEqual(expected, parts.v1)) return new Response('Invalid signature', { status: 401 });
  const body = await req.json().catch(() => ({})), eventId = String(body.id || dataId || crypto.randomUUID());
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const inserted = await admin.from('webhook_events').insert({ provider: 'mercadopago', external_event_id: eventId, event_type: body.type || body.action || null, payload: body });
  if (inserted.error?.code === '23505') return new Response('ok', { status: 200 }); if (inserted.error) return new Response('Webhook storage failed', { status: 500 });
  if (body.type !== 'payment' || !dataId) { await admin.from('webhook_events').update({ processed_at: new Date().toISOString() }).eq('provider', 'mercadopago').eq('external_event_id', eventId); return new Response('ok', { status: 200 }); }
  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, { headers: { Authorization: `Bearer ${mpToken}` } }); const payment = await mpResponse.json().catch(() => null);
  if (!mpResponse.ok || !payment) return new Response('Payment lookup failed', { status: 502 });
  const reference = String(payment.external_reference || ''), [kind, itemId, userId] = reference.split(':'); if (!userId || !kind) return new Response('ok', { status: 200 });
  const status = payment.status === 'approved' ? 'paid' : payment.status === 'rejected' || payment.status === 'cancelled' ? 'failed' : 'pending';
  const { data: dbPayment } = await admin.from('payments').select('id,amount,status').eq('user_id', userId).eq('payment_gateway_id', reference).maybeSingle(); if (!dbPayment) return new Response('Payment record not found', { status: 404 });
  const providerAmount = Number(payment.transaction_amount);
  const expectedAmount = Number(dbPayment.amount);
  const currency = String(payment.currency_id || '');
  if (!Number.isFinite(providerAmount) || Math.abs(providerAmount - expectedAmount) > 0.001 || currency !== 'BRL') {
    await admin.rpc('record_payment_security_event', { p_payment_id: dbPayment.id, p_provider: 'mercadopago', p_provider_payment_id: String(payment.id || dataId), p_reason: 'amount_or_currency_mismatch', p_metadata: { expected_amount: expectedAmount, received_amount: providerAmount, currency } });
    return new Response('Payment integrity check failed', { status: 409 });
  }
  await admin.from('payments').update({ status }).eq('id', dbPayment.id);
  if (status === 'paid' && dbPayment.status !== 'paid') {
    const amount = providerAmount;
    if (kind === 'purchase') {
      const { data: video } = await admin.from('videos').select('creator_id').eq('id', itemId).single();
      if (video) { await admin.from('purchases').upsert({ user_id: userId, video_id: itemId, creator_id: video.creator_id, amount, payment_method: 'pix', status: 'completed' }, { onConflict: 'user_id,video_id' }); await admin.rpc('credit_creator', { p_creator_id: video.creator_id, p_gross: amount, p_reference_id: String(payment.id), p_metadata: { provider: 'mercadopago', payment_id: String(payment.id) } }); }
    } else if (kind === 'subscription') {
      const { data: plan } = await admin.from('subscription_plans').select('creator_id,tier,price').eq('id', itemId).single();
      if (plan) { const end = new Date(); end.setMonth(end.getMonth() + 1); await admin.from('subscriptions').upsert({ user_id: userId, creator_id: plan.creator_id, plan_tier: plan.tier, amount: Number(plan.price), status: 'active', current_period_end: end.toISOString() }, { onConflict: 'user_id,creator_id' }); }
    } else if (kind === 'wallet_deposit') {
      await admin.rpc('record_wallet_entry', { p_user_id: userId, p_entry_type: 'deposit', p_amount: amount, p_reference_id: String(payment.id), p_metadata: { provider: 'mercadopago' } });
    }
  }
  await admin.from('webhook_events').update({ processed_at: new Date().toISOString() }).eq('provider', 'mercadopago').eq('external_event_id', eventId); return new Response('ok', { status: 200 });
});
