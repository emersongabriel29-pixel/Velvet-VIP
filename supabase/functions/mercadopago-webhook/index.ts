import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join(''); }

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!secret || !supabaseUrl || !serviceKey || !mpToken) return new Response('Server not configured', { status: 500 });

  const signature = req.headers.get('x-signature') || '';
  const requestId = req.headers.get('x-request-id') || '';
  const url = new URL(req.url);
  const dataId = url.searchParams.get('data.id') || '';
  const parts = Object.fromEntries(signature.split(',').map(p => p.split('=', 2).map(s => s.trim())).filter(p => p.length === 2));
  const ts = parts.ts || '';
  const v1 = parts.v1 || '';
  const manifestParts = [`id:${dataId}`];
  if (requestId) manifestParts.push(`request-id:${requestId}`);
  if (ts) manifestParts.push(`ts:${ts}`);
  const expected = await hmac(secret, `${manifestParts.join(';')};`);
  if (!v1 || !timingSafeEqual(expected, v1)) return new Response('Invalid signature', { status: 401 });

  const body = await req.json().catch(() => ({}));
  const eventId = String(body.id || dataId || crypto.randomUUID());
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const inserted = await admin.from('webhook_events').insert({ provider: 'mercadopago', external_event_id: eventId, event_type: body.type || body.action || null, payload: body });
  if (inserted.error?.code === '23505') return new Response('ok', { status: 200 });
  if (inserted.error) return new Response('Webhook storage failed', { status: 500 });

  if (body.type !== 'payment' || !dataId) {
    await admin.from('webhook_events').update({ processed_at: new Date().toISOString() }).eq('provider', 'mercadopago').eq('external_event_id', eventId);
    return new Response('ok', { status: 200 });
  }

  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, { headers: { Authorization: `Bearer ${mpToken}` } });
  const payment = await mpResponse.json().catch(() => null);
  if (!mpResponse.ok || !payment) return new Response('Payment lookup failed', { status: 502 });

  const reference = String(payment.external_reference || '');
  const [kind, itemId, userId] = reference.split(':');
  if (!userId || !kind) return new Response('ok', { status: 200 });

  const status = payment.status === 'approved' ? 'paid' : payment.status === 'rejected' || payment.status === 'cancelled' ? 'failed' : 'pending';
  const { data: dbPayment } = await admin.from('payments').select('id,amount,status').eq('user_id', userId).eq('payment_gateway_id', reference).maybeSingle();
  if (!dbPayment) return new Response('Payment record not found', { status: 404 });

  await admin.from('payments').update({ status, payment_gateway_id: String(payment.id) }).eq('id', dbPayment.id);

  if (status === 'paid' && dbPayment.status !== 'paid') {
    const amount = Number(payment.transaction_amount || dbPayment.amount || 0);
    if (kind === 'purchase') {
      const { data: video } = await admin.from('videos').select('creator_id').eq('id', itemId).single();
      if (video) {
        await admin.from('purchases').upsert({ user_id: userId, video_id: itemId, creator_id: video.creator_id, amount, payment_method: 'pix', status: 'completed' }, { onConflict: 'user_id,video_id' });
        const commission = Number(Deno.env.get('CREATOR_SHARE_PERCENT') || '85') / 100;
        const creatorCredit = Math.round(amount * commission * 100) / 100;
        const { data: creator } = await admin.from('creators').select('user_id').eq('id', video.creator_id).single();
        if (creator) {
          await admin.from('wallet_ledger').insert({ user_id: creator.user_id, payment_id: dbPayment.id, entry_type: 'creator_credit', amount: creatorCredit, reference_id: String(payment.id), metadata: { gross: amount, share_percent: commission * 100 } });
          await admin.from('creators').update({ gross_earnings: creatorCredit }).eq('id', video.creator_id);
        }
      }
    } else if (kind === 'wallet_deposit') {
      await admin.rpc('record_wallet_entry', { p_user_id: userId, p_entry_type: 'deposit', p_amount: amount, p_reference_id: String(payment.id), p_metadata: { provider: 'mercadopago' } });
    }
  }

  await admin.from('webhook_events').update({ processed_at: new Date().toISOString() }).eq('provider', 'mercadopago').eq('external_event_id', eventId);
  return new Response('ok', { status: 200 });
});
