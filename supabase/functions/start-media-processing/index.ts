import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const allowedOrigins=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean);
const cors=(req:Request)=>{const origin=req.headers.get('Origin')||'';return {'Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}};
const json=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'no-store'}});
const originHosts=()=>allowedOrigins.flatMap(value=>{try{return [new URL(value).hostname]}catch{return []}});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
  if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),provider=(Deno.env.get('STREAMING_PROVIDER')||'').toLowerCase(),accountId=Deno.env.get('CLOUDFLARE_ACCOUNT_ID'),apiToken=Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
  if(!url||!key)return json(req,{error:'Server not configured'},500);
  if(provider!=='cloudflare'||!accountId||!apiToken)return json(req,{error:'Transcoding provider not configured',code:'provider_not_configured'},503);
  const auth=req.headers.get('Authorization');
  if(!auth?.startsWith('Bearer '))return json(req,{error:'Authentication required'},401);
  const admin=createClient(url,key,{auth:{persistSession:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(auth.slice(7));
  if(authError||!user)return json(req,{error:'Invalid session'},401);
  const body=await req.json().catch(()=>null),videoId=body?.video_id;
  if(typeof videoId!=='string')return json(req,{error:'video_id required'},400);
  const {data:video}=await admin.from('videos').select('id,creator_id,title,source_storage_path,content_kind').eq('id',videoId).maybeSingle();
  if(!video||video.content_kind!=='long'||!video.source_storage_path)return json(req,{error:'Long video source not found'},404);
  const {data:creator}=await admin.from('creators').select('user_id,is_approved,identity_status,content_rights_confirmed').eq('id',video.creator_id).maybeSingle();
  if(creator?.user_id!==user.id||!creator.is_approved||creator.identity_status!=='verified'||creator.content_rights_confirmed!==true)return json(req,{error:'Creator verification required'},403);
  const {data:job}=await admin.from('media_processing_jobs').select('id,status,provider_asset_id').eq('video_id',videoId).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(!job)return json(req,{error:'Media job not found'},404);
  if(job.provider_asset_id)return json(req,{ok:true,status:job.status,provider_asset_id:job.provider_asset_id});
  const {data:signed,error:signedError}=await admin.storage.from('velvet-media').createSignedUrl(video.source_storage_path,900);
  if(signedError||!signed?.signedUrl)return json(req,{error:'Could not sign source media'},500);

  const cf=await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,{
    method:'POST',headers:{Authorization:`Bearer ${apiToken}`,'Content-Type':'application/json','Upload-Creator':user.id},
    body:JSON.stringify({input:signed.signedUrl,creator:user.id,name:video.title,requireSignedURLs:true,allowedOrigins:originHosts(),meta:{velvet_video_id:videoId}})
  });
  const payload=await cf.json().catch(()=>null),asset=payload?.result;
  if(!cf.ok||!payload?.success||!asset?.uid){
    await admin.from('media_processing_jobs').update({status:'error',error_message:'provider_upload_failed',attempts:(Number(job?.attempts)||0)+1}).eq('id',job.id);
    await admin.from('videos').update({processing_status:'error',media_status:'error',media_error:'provider_upload_failed'}).eq('id',videoId);
    return json(req,{error:'Transcoding provider rejected media',provider_errors:payload?.errors||[]},502);
  }
  await admin.from('media_processing_jobs').update({status:'processing',provider:'cloudflare',provider_asset_id:asset.uid,provider_metadata:{state:asset.status?.state||'queued'}}).eq('id',job.id);
  await admin.from('videos').update({processing_status:'processing',media_status:'processing'}).eq('id',videoId);
  await admin.from('external_provider_events').upsert({provider_type:'streaming',provider:'cloudflare',external_event_id:asset.uid,subject_user_id:user.id,status:'processing',metadata:{kind:'vod',video_id:videoId,job_id:job.id}},{onConflict:'provider_type,provider,external_event_id'});
  return json(req,{ok:true,status:'processing',provider_asset_id:asset.uid});
});