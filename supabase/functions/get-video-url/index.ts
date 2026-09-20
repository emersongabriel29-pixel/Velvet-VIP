import { isPublishedVideo, subscriptionAllowsVideo } from '../_shared/video-policy.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(v => v.trim()).filter(Boolean);
const allowedStreamingHosts = new Set((Deno.env.get('STREAMING_ALLOWED_HOSTS') || '').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean));
const corsFor = (req: Request) => {
  const origin=req.headers.get('Origin')||'';
  return {'Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
};
const response=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsFor(req),'Content-Type':'application/json','Cache-Control': 'no-store'}});
const bytesToUrl=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const createPlaybackToken=async(videoId:string,secret:string)=>{
  const payload=bytesToUrl(new TextEncoder().encode(JSON.stringify({v:videoId,e:Math.floor(Date.now()/1000)+600})));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload)));
  return `${payload}.${bytesToUrl(signature)}`;
};

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsFor(req)});
  if(req.method!=='POST') return response(req,{error:'Method not allowed'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!supabaseUrl||!serviceKey) return response(req,{error:'Server not configured'},500);
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  const body=await req.json().catch(()=>null);
  const videoId=body?.video_id;
  if(typeof videoId!=='string') return response(req,{error:'video_id required'},400);

  const {data:video}=await admin.from('videos').select('id,video_url,is_premium,creator_id,required_tier,access_type,content_level,anonymous_access,moderation_status,media_status,processing_status,is_draft,is_removed,hls_manifest_path,hls_storage_path').eq('id',videoId).single();
  if(!video) return response(req,{error:'Video not found'},404);

  const {data:owner}=await admin.from('creators').select('user_id,is_approved').eq('id',video.creator_id).single();
  if(!owner?.user_id || owner.is_approved !== true) return response(req,{error:'Creator unavailable'},404);
  const {data:ownerProfile,error:ownerError}=await admin.from('profiles').select('is_blocked,is_suspended').eq('id',owner.user_id).single();
  const ownerRestrictions=await admin.from('account_restrictions').select('id').eq('subject_user_id',owner.user_id).eq('is_active',true).eq('scope','account').lte('starts_at',new Date().toISOString()).or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`).limit(1);
  if(ownerError || !ownerProfile || ownerProfile.is_blocked || ownerProfile.is_suspended || ownerRestrictions.error || ownerRestrictions.data?.length) return response(req,{error:'Creator unavailable'},403);
  const anonymousAllowed=video.anonymous_access===true&&video.is_premium===false&&video.access_type==='free'&&video.required_tier==='free'&&video.content_level==='sensual'&&isPublishedVideo(video);
  if(!anonymousAllowed){
    const auth=req.headers.get('Authorization');
    if(!auth?.startsWith('Bearer ')) return response(req,{error:'Authentication required'},401);
    const {data:{user},error:authError}=await admin.auth.getUser(auth.slice(7));
    if(authError||!user) return response(req,{error:'Invalid session'},401);
    const {data:profile}=await admin.from('profiles').select('age_verified,birth_date,is_blocked,is_suspended,role').eq('id',user.id).single();
    if(!profile?.age_verified||profile.is_blocked||profile.is_suspended||!profile.birth_date||new Date(profile.birth_date)>new Date(new Date().setFullYear(new Date().getFullYear()-18))) return response(req,{error:'18+ verification required'},403);
    const privileged = owner.user_id===user.id || profile.role==='admin';
    if (!isPublishedVideo(video) && (!privileged || video.is_removed || video.media_status!=='ready')) return response(req,{error:'Video unavailable'},403);
    const restriction = await admin.from('account_restrictions').select('id').eq('subject_user_id', user.id).eq('is_active',true).eq('scope','account').lte('starts_at',new Date().toISOString()).or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`).limit(1);
    if (restriction.error || restriction.data?.length) return response(req,{error:'Account restricted'},403);
    if(video.is_premium || video.access_type !== 'free' || video.required_tier !== 'free'){
      let entitled=owner.user_id===user.id||profile.role==='admin';
      const {data:purchase}=entitled?{data:null}:await admin.from('purchases').select('id').eq('user_id',user.id).eq('video_id',videoId).eq('status','completed').maybeSingle();
      entitled=entitled||Boolean(purchase);
      if(!entitled){
        const {data:subscription}=await admin.from('subscriptions').select('plan_tier,current_period_end,status').eq('user_id',user.id).eq('creator_id',video.creator_id).eq('status','active').maybeSingle();
        entitled=subscriptionAllowsVideo(video,subscription);
      }
      if(!entitled) return response(req,{error:'Premium access required'},403);
    }
  }

  const resolveRef=async(ref:unknown)=>{
    if(typeof ref!=='string'||!ref) return null;
    if(ref.startsWith('https://')){
      try{const u=new URL(ref);return allowedStreamingHosts.has(u.hostname.toLowerCase())?ref:null;}catch{return null;}
    }
    const path=ref.startsWith('storage://')?ref.slice('storage://'.length):ref;
    if(path.includes('..')||path.startsWith('/')) return null;
    const {data,error}=await admin.storage.from('velvet-media').createSignedUrl(path,120);
    return error||!data?.signedUrl?null:data.signedUrl;
  };

  if(!video.video_url) return response(req,{error:'Media unavailable'},404);
  if(video.video_url.startsWith('storage://')){
    const originalPath=video.video_url.slice('storage://'.length);
    if(!originalPath.startsWith(owner.user_id+'/videos/')) return response(req,{error:'Invalid media ownership'},403);
  }
  const original=await resolveRef(video.video_url);
  if(!original) return response(req,{error:'Unmanaged media URL rejected'},403);

  const {data:job}=await admin.from('media_processing_jobs').select('renditions,hls_manifest_path,archive_manifest_path,status').eq('video_id',videoId).eq('status','ready').order('updated_at',{ascending:false}).limit(1).maybeSingle();
  const raw=Array.isArray(job?.renditions)?job.renditions:[];
  const renditions:any[]=[];
  for(const item of raw){
    const ref=item?.storage_path||item?.playback_reference||item?.url;
    const url=await resolveRef(ref);
    if(!url) continue;
    const height=Number(item?.height||0);
    const label=String(item?.label||(height?height+'p':'Original')).slice(0,20);
    renditions.push({label,height,url,type:String(item?.type||'video/mp4')});
  }
  renditions.sort((a,b)=>a.height-b.height);

  const archivedManifest=job?.archive_manifest_path;
  const legacyManifest=job?.hls_manifest_path||video.hls_manifest_path||video.hls_storage_path;
  const manifest=archivedManifest
    ? `${supabaseUrl}/functions/v1/get-hls-playlist?video_id=${encodeURIComponent(videoId)}&token=${encodeURIComponent(await createPlaybackToken(videoId,serviceKey))}`
    : legacyManifest?await resolveRef(legacyManifest):null;
  const autoUrl=original;
  const sources=[{label:'Automático',height:0,url:original,type:'video/mp4'},...renditions.filter((x,i,a)=>i===a.findIndex(y=>y.label===x.label))];

  return response(req,{url:autoUrl,sources,adaptive_manifest:manifest,expires_in:120,anonymous:anonymousAllowed,adaptive:Boolean(manifest)});
});
