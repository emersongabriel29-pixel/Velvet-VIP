import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean);
const cors=(req:Request)=>{const origin=req.headers.get('Origin')||'';return {'Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}};
const json=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'no-store'}});
const originHosts=()=>allowedOrigins.flatMap(value=>{try{return [new URL(value).hostname]}catch{return []}});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
  if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const provider=(Deno.env.get('STREAMING_PROVIDER')||'').toLowerCase();
  const accountId=Deno.env.get('CLOUDFLARE_ACCOUNT_ID'),apiToken=Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
  if(!supabaseUrl||!serviceKey)return json(req,{error:'Server not configured'},500);
  if(provider!=='cloudflare'||!accountId||!apiToken)return json(req,{error:'Streaming provider not configured',code:'provider_not_configured'},503);

  const auth=req.headers.get('Authorization');
  if(!auth?.startsWith('Bearer '))return json(req,{error:'Authentication required'},401);
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(auth.slice(7));
  if(authError||!user)return json(req,{error:'Invalid session'},401);

  const body=await req.json().catch(()=>null);
  const title=String(body?.title||'').trim().slice(0,120);
  const requiredPlan=body?.required_plan==='vip'?'vip':'plus';
  const scheduledAt=body?.scheduled_at?new Date(body.scheduled_at):new Date();
  if(!title)return json(req,{error:'title required'},400);
  if(Number.isNaN(scheduledAt.getTime()))return json(req,{error:'invalid scheduled_at'},400);

  const {data:creator}=await admin.from('creators')
    .select('id,is_approved,identity_status,content_rights_confirmed')
    .eq('user_id',user.id).maybeSingle();
  if(!creator?.is_approved)return json(req,{error:'Approved creator required'},403);
  if(creator.identity_status!=='verified'||creator.content_rights_confirmed!==true)return json(req,{error:'Identity and content-rights verification required'},403);
  const {data:restriction}=await admin.from('account_restrictions').select('id').eq('subject_user_id',user.id).eq('is_active',true).in('scope',['all','live','publish']).lte('starts_at',new Date().toISOString()).or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`).limit(1).maybeSingle();
  if(restriction)return json(req,{error:'Live publishing restricted'},403);

  const cf=await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`,{
    method:'POST',
    headers:{Authorization:`Bearer ${apiToken}`,'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},
    body:JSON.stringify({
      enabled:true,
      defaultCreator:user.id,
      preferLowLatency:true,
      meta:{name:title,velvet_creator_id:creator.id},
      recording:{mode:'automatic',requireSignedURLs:true,allowedOrigins:originHosts(),hideLiveViewerCount:false,timeoutSeconds:0}
    })
  });
  const payload=await cf.json().catch(()=>null);
  const input=payload?.result;
  if(!cf.ok||!payload?.success||!input?.uid||!input?.playback?.hls||!input?.rtmps?.url||!input?.rtmps?.streamKey){
    return json(req,{error:'Streaming provider rejected live input',provider_errors:payload?.errors||[]},502);
  }

  const {data:live,error:liveError}=await admin.from('live_sessions').insert({
    creator_id:creator.id,title,status:'scheduled',moderation_status:'approved',required_plan:requiredPlan,
    scheduled_at:scheduledAt.toISOString(),streaming_provider:'cloudflare'
  }).select('id').single();
  if(liveError||!live){
    return json(req,{error:'Could not register live session'},500);
  }

  const attached=await admin.rpc('attach_streaming_room',{p_live_id:live.id,p_provider:'cloudflare',p_room_id:input.uid,p_playback_reference:input.playback.hls});
  if(attached.error){
    await admin.from('live_sessions').update({status:'cancelled'}).eq('id',live.id);
    return json(req,{error:'Could not attach streaming room'},500);
  }
  await admin.from('external_provider_events').upsert({
    provider_type:'streaming',provider:'cloudflare',external_event_id:input.uid,subject_user_id:user.id,status:'created',
    metadata:{kind:'live_input',live_id:live.id}
  },{onConflict:'provider_type,provider,external_event_id'});

  return json(req,{
    live_id:live.id,
    provider:'cloudflare',
    ingest:{rtmps_url:input.rtmps.url,stream_key:input.rtmps.streamKey,srt:input.srt||null},
    message:'Configure OBS/encoder with these private ingest credentials, then verify the transmission.'
  });
});