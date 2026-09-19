import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
function hex(bytes:ArrayBuffer){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function hmac(secret:string,message:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message)));}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: true });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
  if (!url || !key || !mpToken || !webhookSecret) return json({ error: 'Webhook não configurado.' }, 503);
  const signature=req.headers.get('x-signature')||'', requestId=req.headers.get('x-request-id')||'', requestUrl=new URL(req.url);
  const dataId=(requestUrl.searchParams.get('data.id')||'').toLowerCase();
  const parts=Object.fromEntries(signature.split(',').map(p=>p.split('=',2).map(s=>s.trim())).filter(p=>p.length===2));
  const tsRaw=String(parts.ts||'');
  const tsValue=Number(tsRaw);
  const tsSeconds=tsValue>10_000_000_000?Math.floor(tsValue/1000):tsValue;
  const now=Math.floor(Date.now()/1000);
  if(!Number.isFinite(tsSeconds)||!tsRaw||Math.abs(now-tsSeconds)>300) return json({error:'Assinatura expirada.'},401);
  const manifest:string[]=[];
  if(dataId)manifest.push(`id:${dataId}`);
  if(requestId)manifest.push(`request-id:${requestId}`);
  if(tsRaw)manifest.push(`ts:${tsRaw}`);
  const expected=await hmac(webhookSecret,`${manifest.join(';')};`);
  if(!parts.v1||!safeEqual(expected,parts.v1)) return json({error:'Assinatura inválida.'},401);
  const payload = await req.json().catch(() => null);
  if (!payload) return json({ error: 'Invalid JSON' }, 400);
  // The payment fetched must be the same ID covered by the signature.
  const paymentId = String(payload.data?.id || '');
  if (!dataId || !/^[0-9]+$/.test(dataId) || paymentId !== dataId) return json({ error: 'Payment ID mismatch' }, 400);
  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${mpToken}` }, signal: AbortSignal.timeout(15000)
  }).catch(() => null);
  if (!paymentResponse?.ok) return json({ error: 'Provider lookup failed' }, 502);
  const payment = await paymentResponse.json().catch(() => null);
  if (!payment || String(payment.id) !== paymentId) return json({ error: 'Provider payment mismatch' }, 502);
  if (!payment.external_reference) return json({ ok: true, ignored: true });
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('settle_verified_payment', { p_payment: {
    id: String(payment.id), status: payment.status, external_reference: payment.external_reference,
    transaction_amount: payment.transaction_amount, currency_id: payment.currency_id,
    payment_type_id: payment.payment_type_id
  } });
  if (error) {
    // Retryable 5xx: the transaction rolled back, including its idempotency marker.
    console.error('payment_settlement_failed', { code: error.code });
    return json({ error: 'Settlement failed; retry required' }, 503);
  }
  return json(data);
});
