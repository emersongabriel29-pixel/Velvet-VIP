import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { transformSync } from 'esbuild';

function loadHandler(path, { client, fetch = async () => new Response('{}'), env = {} }) {
  let handler;
  const policy = {};
  vm.runInNewContext(transformSync(fs.readFileSync('supabase/functions/_shared/video-policy.ts','utf8'),{loader:'ts',format:'cjs'}).code,
    {module:policy,exports:policy.exports={}});
  const context = {module:{exports:{}}, exports:{}, Response, Request, URL, TextEncoder, AbortSignal,
    crypto:webcrypto, console:{error(){}}, fetch,
    require: name => name.includes('video-policy') ? policy.exports : {createClient:()=>client},
    Deno:{env:{get:key=>env[key]},serve:fn=>{handler=fn;}}};
  vm.runInNewContext(transformSync(fs.readFileSync(path,'utf8'),{loader:'ts',format:'cjs'}).code,context);
  return handler;
}
const webhookEnv={SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'server',MERCADOPAGO_ACCESS_TOKEN:'provider',MERCADOPAGO_WEBHOOK_SECRET:'test-secret'};
async function notification(id='123', bodyId=id, ts=String(Date.now())) {
  const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode('test-secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Buffer.from(await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(`id:${id};request-id:request-1;ts:${ts};`))).toString('hex');
  return new Request(`https://example.invalid/payment-webhook?data.id=${id}`,{method:'POST',headers:{'x-request-id':'request-1','x-signature':`ts=${ts},v1=${signature}`},body:JSON.stringify({data:{id:bodyId}})});
}
for (const [label, error, status] of [['success',null,200],['database failure',{code:'XX000'},503]]) {
  test(`webhook ${label} returns ${status} and calls atomic settlement`, async()=>{
    let calls=0;
    const handler=loadHandler('supabase/functions/payment-webhook/index.ts',{env:webhookEnv,
      client:{rpc:async(name,args)=>{assert.equal(name,'settle_verified_payment');assert.equal(args.p_payment.id,'123');calls++;return {data:{ok:true},error};}},
      fetch:async url=>{assert.match(url,/\/payments\/123$/);return Response.json({id:123,status:'approved',external_reference:'checkout',transaction_amount:20,currency_id:'BRL'});}});
    assert.equal((await handler(await notification())).status,status);assert.equal(calls,1);
  });
}
test('signed query ID cannot authorize a different body payment',async()=>{
  const handler=loadHandler('supabase/functions/payment-webhook/index.ts',{env:webhookEnv,client:{},fetch:()=>{throw Error('must not fetch')}});
  assert.equal((await handler(await notification('123','456'))).status,400);
});
test('expired signature is rejected before provider lookup',async()=>{
  const handler=loadHandler('supabase/functions/payment-webhook/index.ts',{env:webhookEnv,client:{}});
  assert.equal((await handler(await notification('123','123','1000'))).status,401);
});

function videoClient(video, { subscription=null, purchase=null, user='viewer', approved=true }={}) {
  return { auth:{getUser:async()=>({data:{user:{id:user}}})},
    storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://example.invalid/signed'}})})},
    from(table) {
      const rows={videos:video,creators:{user_id:'owner',is_approved:approved},profiles:{age_verified:true,birth_date:'1990-01-01',role:'user'},
        purchases:purchase,subscriptions:subscription,account_restrictions:[],media_processing_jobs:null};
      const q={then(resolve){return Promise.resolve({data:rows[table],error:null}).then(resolve)}};
      for(const method of ['select','eq','lte','or','limit','single','maybeSingle','order']) q[method]=()=>q;
      return q;
    }
  };
}
const published={id:'video',creator_id:'creator',video_url:'storage://owner/videos/original.mp4',is_premium:false,
  access_type:'free',required_tier:'free',anonymous_access:true,content_level:'sensual',moderation_status:'approved',
  media_status:'ready',processing_status:'ready',is_draft:false,is_removed:false};
async function playback(video,options) {
  const handler=loadHandler('supabase/functions/get-video-url/index.ts',{env:{SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'server'},client:videoClient(video,options)});
  return handler(new Request('https://example.invalid/get-video-url',{method:'POST',headers:{Authorization:'Bearer test-user'},body:JSON.stringify({video_id:'video'})}));
}
test('published free content plays without a premium entitlement',async()=>assert.equal((await playback(published)).status,200));
for(const change of [{is_removed:true},{is_draft:true},{moderation_status:'pending'},{processing_status:'queued'},{media_status:'quarantined'}]) {
  test(`unpublished content denied to ordinary viewers: ${JSON.stringify(change)}`,async()=>assert.equal((await playback({...published,...change})).status,403));
}
test('VIP subscription does not unlock a separate PPV purchase',async()=>{
  const subscription={status:'active',plan_tier:'vip',current_period_end:'2099-01-01'};
  assert.equal((await playback({...published,is_premium:true,access_type:'pay_per_view',required_tier:'vip'},{subscription})).status,403);
});
test('completed purchase unlocks PPV',async()=>assert.equal((await playback({...published,is_premium:true,access_type:'pay_per_view',required_tier:'vip'},{purchase:{id:'purchase'}})).status,200));

test('unapproved creator cannot distribute even free published content',async()=>assert.equal((await playback(published,{approved:false})).status,404));
