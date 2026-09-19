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
  const eventKey = `${paymentId}:${String(payment.status || 'unknown')}`;
  const { error: eventError } = await admin.from('payment_events').insert({
    gateway: 'mercadopago', gateway_event_id: eventKey, payment_id: String(paymentId),
    event_type: eventType, status: 'received', payload
  });
  if (eventError?.code === '23505') return json({ ok: true, duplicate: true });

  if (payment.status === 'refunded' || payment.status === 'charged_back') {
    if (session.kind === 'creator_plan') {
      const { data: plan } = await admin.from('creator_plans').select('creator_id').eq('id', session.reference_id).maybeSingle();
      if (plan?.creator_id) {
        await admin.rpc('reverse_creator_credit',{p_creator_id:plan.creator_id,p_provider:'mercadopago',p_reference_id:String(paymentId)});
        await admin.from('creator_subscriptions').update({status:'cancelled'}).eq('user_id',session.user_id).eq('creator_plan_id',session.reference_id);
        await admin.from('subscriptions').update({status:'cancelled'}).eq('user_id',session.user_id).eq('creator_id',plan.creator_id);
      }
    } else if (session.kind === 'pay_per_view') {
      const creatorId=session.metadata?.creator_id;
      const videoId=session.reference_id;
      if (creatorId) await admin.rpc('reverse_creator_credit',{p_creator_id:creatorId,p_provider:'mercadopago',p_reference_id:String(paymentId)});
      if (videoId) await admin.from('purchases').update({status:'refunded'}).eq('user_id',session.user_id).eq('video_id',videoId);
    } else if (session.kind === 'tip') {
      const creatorId=session.metadata?.creator_id;
      if (creatorId) {
        await admin.rpc('reverse_creator_credit',{p_creator_id:creatorId,p_provider:'mercadopago',p_reference_id:String(paymentId)});
        await admin.from('creator_tips').update({status:'refunded'}).eq('payment_gateway_id',String(paymentId));
      }
    } else if (session.kind === 'platform_plan') {
      const {data:freePlan}=await admin.from('platform_plans').select('id').eq('slug','gratis').maybeSingle();
      const {data:profile}=await admin.from('profiles').select('platform_plan_id').eq('id',session.user_id).maybeSingle();
      if(freePlan?.id && profile?.platform_plan_id===session.reference_id) await admin.from('profiles').update({platform_plan_id:freePlan.id}).eq('id',session.user_id);
    }
    await admin.from('financial_transactions').update({state:payment.status==='charged_back'?'chargeback':'refunded',updated_at:new Date().toISOString()})
      .eq('provider','mercadopago').eq('provider_reference',String(paymentId));
    await admin.from('checkout_sessions').update({status:'refunded',updated_at:new Date().toISOString()}).eq('id',sessionId);
    await admin.from('payment_events').update({status:'processed',processed_at:new Date().toISOString()}).eq('gateway','mercadopago').eq('gateway_event_id',eventKey);
    return json({ok:true,status:payment.status});
  }
  if (payment.status !== 'approved') {
    const nextStatus=payment.status==='rejected'?'failed':payment.status==='cancelled'?'cancelled':'pending';
    await admin.from('checkout_sessions').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', sessionId);
    return json({ ok: true, status: payment.status });
  }

  await admin.from('checkout_sessions').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', sessionId);
  if (session.kind === 'platform_plan') {
    await admin.from('profiles').update({ platform_plan_id: session.reference_id }).eq('id', session.user_id);
  } else if (session.kind === 'creator_plan') {
    const { data: plan } = await admin.from('creator_plans').select('creator_id,price,tier,billing_period,creator_share_percent,platform_fee_percent').eq('id', session.reference_id).single();
    if (plan) {
      const days=plan.billing_period==='annual'?365:plan.billing_period==='semiannual'?180:30;
      const end=new Date(Date.now()+days*86400000).toISOString();
      const creatorAmount=Number((Number(plan.price)*Number(plan.creator_share_percent)/100).toFixed(2));
      const platformAmount=Number((Number(plan.price)-creatorAmount).toFixed(2));
      await admin.from('creator_subscriptions').upsert({
        user_id:session.user_id,creator_id:plan.creator_id,creator_plan_id:session.reference_id,
        status:'active',amount_paid:plan.price,creator_amount:creatorAmount,platform_amount:platformAmount,
        billing_period:plan.billing_period,current_period_end:end
      },{onConflict:'user_id,creator_id'});
      await admin.from('subscriptions').upsert({
        user_id:session.user_id,creator_id:plan.creator_id,plan_tier:plan.tier,amount:plan.price,status:'active',current_period_end:end
      },{onConflict:'user_id,creator_id'});
      await admin.rpc('credit_creator',{
        p_creator_id:plan.creator_id,p_gross:Number(plan.price),p_reference_id:String(paymentId),
        p_metadata:{provider:'mercadopago',kind:'subscription',checkout_session_id:sessionId,share_percent:Number(plan.creator_share_percent)}
      });
      await admin.from('financial_transactions').upsert({
        user_id:session.user_id,creator_id:plan.creator_id,checkout_session_id:sessionId,kind:'subscription',
        gross_amount:Number(plan.price),creator_amount:creatorAmount,platform_amount:platformAmount,state:'available',
        provider:'mercadopago',provider_reference:String(paymentId)
      },{onConflict:'provider,provider_reference'});
    }
  } else if (session.kind === 'pay_per_view') {
    const videoId=session.reference_id;
    const creatorId=session.metadata?.creator_id;
    if (videoId && creatorId) {
      const {data:settings}=await admin.from('platform_settings').select('platform_fee_percent').eq('id',true).maybeSingle();
      const feePercent=Math.min(100,Math.max(0,Number(settings?.platform_fee_percent??15)));
      const share=100-feePercent;
      const creatorAmount=Number((Number(session.amount)*share/100).toFixed(2));
      const platformAmount=Number((Number(session.amount)-creatorAmount).toFixed(2));
      const paymentMethod=payment.payment_type_id==='credit_card'?'credit_card':'pix';
      await admin.from('purchases').upsert({
        user_id:session.user_id,video_id:videoId,creator_id:creatorId,amount:Number(session.amount),
        payment_method:paymentMethod,status:'completed'
      },{onConflict:'user_id,video_id'});
      await admin.rpc('credit_creator',{
        p_creator_id:creatorId,p_gross:Number(session.amount),p_reference_id:String(paymentId),
        p_metadata:{provider:'mercadopago',kind:'ppv',checkout_session_id:sessionId,share_percent:share}
      });
      await admin.from('financial_transactions').upsert({
        user_id:session.user_id,creator_id:creatorId,checkout_session_id:sessionId,kind:'ppv',
        gross_amount:Number(session.amount),creator_amount:creatorAmount,platform_amount:platformAmount,state:'available',
        provider:'mercadopago',provider_reference:String(paymentId)
      },{onConflict:'provider,provider_reference'});
    }
  } else if (session.kind === 'tip') {
    const creatorId = session.metadata?.creator_id;
    if (creatorId) {
      const {data:creator}=await admin.from('creators').select('tip_share_percent').eq('id',creatorId).single();
      const share=Number(creator?.tip_share_percent||90);
      const creatorAmount=Number((Number(session.amount)*share/100).toFixed(2));
      const platformAmount=Number((Number(session.amount)-creatorAmount).toFixed(2));
      await admin.from('creator_tips').upsert({
        sender_id:session.user_id,creator_id:creatorId,amount:session.amount,platform_fee:platformAmount,
        creator_amount:creatorAmount,message:session.metadata?.message||'',status:'paid',payment_gateway_id:String(paymentId)
      },{onConflict:'payment_gateway_id'});
      await admin.rpc('credit_creator',{
        p_creator_id:creatorId,p_gross:Number(session.amount),p_reference_id:String(paymentId),
        p_metadata:{provider:'mercadopago',kind:'tip',checkout_session_id:sessionId,share_percent:share}
      });
      await admin.from('financial_transactions').upsert({
        user_id:session.user_id,creator_id:creatorId,checkout_session_id:sessionId,kind:'tip',
        gross_amount:Number(session.amount),creator_amount:creatorAmount,platform_amount:platformAmount,state:'available',
        provider:'mercadopago',provider_reference:String(paymentId)
      },{onConflict:'provider,provider_reference'});
    }
  }
  await admin.from('payment_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('gateway', 'mercadopago').eq('gateway_event_id', eventKey);
  return json({ ok: true, status: 'approved' });
});
