import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const allowedOrigins=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean);
const cors=(req:Request)=>{const origin=req.headers.get('Origin')||'';return {'Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}};
const json=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'no-store'}});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
  if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),accountId=Deno.env.get('CLOUDFLARE_ACCOUNT_ID'),apiToken=Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
  if(!url||!key||!accountId||!apiToken)return json(req,{error:'Transcoding provider not configured'},503);
  const auth=req.headers.get('Authorization');
  if(!auth?.startsWith('Bearer '))return json(req,{error:'Authentication required'},401);
  const admin=createClient(url,key,{auth:{persistSession:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(auth.slice(7));
  if(authError||!user)return json(req,{error:'Invalid session'},401);
  const body=await req.json().catch(()=>null),videoId=body?.video_id;
  if(typeof videoId!=='string')return json(req,{error:'video_id required'},400);
  const {data:job}=await admin.from('media_processing_jobs').select('id,video_id,provider,provider_asset_id,status').eq('video_id',videoId).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(!job||job.provider!=='cloudflare'||!job.provider_asset_id)return json(req,{error:'Provider media job not found'},404);
  const {data:video}=await admin.from('videos').select('creator_id').eq('id',videoId).maybeSingle();
  const {data:creator}=video?await admin.from('creators').select('user_id').eq('id',video.creator_id).maybeSingle():{data:null};
  if(creator?.user_id!==user.id)return json(req,{error:'Forbidden'},403);
  const cf=await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${encodeURIComponent(job.provider_asset_id)}`,{headers:{Authorization:`Bearer ${apiToken}`}});
  const payload=await cf.json().catch(()=>null),asset=payload?.result;
  if(!cf.ok||!payload?.success||!asset)return json(req,{error:'Could not read media provider state'},502);
  const state=String(asset.status?.state||'');
  if(state==='error'){
    const message=String(asset.status?.errorReasonCode||asset.status?.errorReasonText||'provider_processing_error').slice(0,500);
    await admin.from('media_processing_jobs').update({status:'error',error_message:message,provider_metadata:{state,pctComplete:asset.status?.pctComplete||null}}).eq('id',job.id);
    await admin.from('videos').update({processing_status:'error',media_status:'error',media_error:message}).eq('id',videoId);
    return json(req,{status:'error',error:message},409);
  }
  if(asset.readyToStream===true&&asset.playback?.hls){
    await admin.from('media_processing_jobs').update({status:'ready',hls_manifest_path:asset.playback.hls,error_message:null,provider_metadata:{state:'ready',thumbnail:asset.thumbnail||null}}).eq('id',job.id);
    await admin.from('videos').update({processing_status:'ready',media_status:'ready',hls_manifest_path:asset.playback.hls,hls_storage_path:null,media_error:null}).eq('id',videoId);
    await admin.from('external_provider_events').update({status:'ready',processed_at:new Date().toISOString()}).eq('provider_type','streaming').eq('provider','cloudflare').eq('external_event_id',job.provider_asset_id);
    return json(req,{status:'ready'});
  }
  await admin.from('media_processing_jobs').update({status:'processing',provider_metadata:{state,pctComplete:asset.status?.pctComplete||null}}).eq('id',job.id);
  return json(req,{status:'processing',provider_state:state,progress:asset.status?.pctComplete||null});
});