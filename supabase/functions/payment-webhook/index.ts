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
  const signature=req.headers.get('x-signature')||'', requestId=req.headers.get('x-request-id')||'', requestUrl=new URL(req.url), dataId=requestUrl.searchParams.get('data.id')||'';
  const parts=Object.fromEntries(signature.split(',').map(p=>p.split('=',2).map(s=>s.trim())).filter(p=>p.length===2));
  const ts=Number(parts.ts||0), now=Math.floor(Date.now()/1000);
  if(!Number.isFinite(ts)||Math.abs(now-ts)>300) return json({error:'Assinatura expirada.'},401);
  const manifest=[`id:${dataId}`]; if(requestId)manifest.push(`request-id:${requestId}`); if(parts.ts)manifest.push(`ts:${parts.ts}`);
  const expected=await hmac(webhookSecret,`${manifest.join(';')};`);
  if(!parts.v1||!safeEqual(expected,parts.v1)) return json({error:'Assinatura inválida.'},401);
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
  const providerAmount=Number(payment.transaction_amount), expectedAmount=Number(session.amount), currency=String(payment.currency_id||'');
  if(!Number.isFinite(providerAmount)||Math.abs(providerAmount-expectedAmount)>0.001||currency!=='BRL'){
    return json({error:'Integridade do pagamento inválida.'},409);
  }
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
