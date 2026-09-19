import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function hmac(secret:string,message:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message)));}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}

Deno.serve(async(req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const provider=(Deno.env.get('AGE_VERIFICATION_PROVIDER')||'').trim().toLowerCase();
  const secret=Deno.env.get('AGE_VERIFICATION_WEBHOOK_SECRET')||'';
  if(!url||!key||!provider||!secret)return json({error:'Identity provider not configured'},503);
  const timestamp=req.headers.get('x-velvet-timestamp')||'',signature=req.headers.get('x-velvet-signature')||'';
  const ts=Number(timestamp),now=Math.floor(Date.now()/1000);
  if(!Number.isFinite(ts)||Math.abs(now-ts)>300)return json({error:'Expired signature'},401);
  const raw=await req.text(),expected=await hmac(secret,`${timestamp}.${raw}`);
  if(!signature||!safeEqual(expected,signature))return json({error:'Invalid signature'},401);
  const body=JSON.parse(raw||'{}');
  const eventProvider=String(body.provider||'').trim().toLowerCase();
  const eventId=String(body.event_id||'').trim(),userId=String(body.user_id||'').trim(),reference=String(body.reference||'').trim();
  if(eventProvider!==provider||!eventId||!userId||!reference)return json({error:'Invalid normalized identity event'},400);

  const admin=createClient(url,key,{auth:{persistSession:false}});
  const {error:eventError}=await admin.from('external_provider_events').upsert({
    provider_type:'identity',provider,external_event_id:eventId,subject_user_id:userId,
    status:body.identity_verified===true?'verified':'rejected',metadata:{reference,age_verified:body.age_verified===true}
  },{onConflict:'provider_type,provider,external_event_id'});
  if(eventError)return json({error:'Could not persist provider event'},500);
  const {error}=await admin.rpc('record_creator_identity_verification',{
    p_user_id:userId,p_provider:provider,p_reference:reference,
    p_identity_verified:body.identity_verified===true,p_age_verified:body.age_verified===true
  });
  if(error)return json({error:'Could not record identity result'},500);
  await admin.from('external_provider_events').update({processed_at:new Date().toISOString()})
    .eq('provider_type','identity').eq('provider',provider).eq('external_event_id',eventId);
  return json({ok:true});
});