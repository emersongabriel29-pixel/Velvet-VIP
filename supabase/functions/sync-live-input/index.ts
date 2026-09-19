import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const allowedOrigins=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean);
const cors=(req:Request)=>{const origin=req.headers.get('Origin')||'';return {'Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}};
const json=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'no-store'}});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
  if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),accountId=Deno.env.get('CLOUDFLARE_ACCOUNT_ID'),apiToken=Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
  if(!url||!key||!accountId||!apiToken)return json(req,{error:'Streaming provider not configured'},503);
  const auth=req.headers.get('Authorization');
  if(!auth?.startsWith('Bearer '))return json(req,{error:'Authentication required'},401);
  const admin=createClient(url,key,{auth:{persistSession:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(auth.slice(7));
  if(authError||!user)return json(req,{error:'Invalid session'},401);
  const body=await req.json().catch(()=>null),liveId=body?.live_id;
  if(typeof liveId!=='string')return json(req,{error:'live_id required'},400);
  const {data:live}=await admin.from('live_sessions').select('id,creator_id,status,streaming_provider').eq('id',liveId).maybeSingle();
  if(!live||live.streaming_provider!=='cloudflare')return json(req,{error:'Cloudflare live input not found'},404);
  const {data:creator}=await admin.from('creators').select('user_id').eq('id',live.creator_id).maybeSingle();
  if(creator?.user_id!==user.id)return json(req,{error:'Forbidden'},403);
  const {data:state}=await admin.rpc('get_live_stream_state',{p_live_id:liveId});
  if(!state?.room_id)return json(req,{error:'Streaming room not attached'},409);
  const cf=await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs/${encodeURIComponent(state.room_id)}`,{headers:{Authorization:`Bearer ${apiToken}`}});
  const payload=await cf.json().catch(()=>null),input=payload?.result;
  if(!cf.ok||!payload?.success||!input)return json(req,{error:'Could not read streaming state'},502);
  const connected=['connected','reconnected'].includes(String(input.status||''));
  if(connected){
    await admin.from('live_sessions').update({status:'live',started_at:new Date().toISOString()}).eq('id',liveId).neq('status','live');
  }
  return json(req,{live_id:liveId,provider_status:input.status,live:connected});
});