import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean);
const corsFor=(req:Request)=>{const origin=req.headers.get('Origin')||'';return {
  'Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:'','Vary':'Origin',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'
};};
const json=(req:Request,data:unknown,status:number)=>new Response(JSON.stringify(data),{status,headers:{...corsFor(req),'Content-Type':'application/json','Cache-Control':'no-store'}});
const fromUrl=(value:string)=>{
  const normalized=value.replace(/-/g,'+').replace(/_/g,'/');
  const padded=normalized+'='.repeat((4-normalized.length%4)%4);
  return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
};
const verifyToken=async(token:string,videoId:string,secret:string)=>{
  const [payload,signature,...rest]=token.split('.');
  if(!payload||!signature||rest.length)return false;
  let claims:{v?:string;e?:number};
  try{claims=JSON.parse(new TextDecoder().decode(fromUrl(payload)));}catch{return false;}
  const now=Math.floor(Date.now()/1000);
  if(claims.v!==videoId||!Number.isInteger(claims.e)||Number(claims.e)<=now||Number(claims.e)>now+610)return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  try{return await crypto.subtle.verify('HMAC',key,fromUrl(signature),new TextEncoder().encode(payload));}catch{return false;}
};
const safePlaylist=(value:string)=>value==='master.m3u8'||/^[1-9]\d{1,4}\/index\.m3u8$/.test(value);

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsFor(req)});
  if(req.method!=='GET')return json(req,{error:'Method not allowed'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!supabaseUrl||!serviceKey)return json(req,{error:'Server not configured'},500);
  const requestUrl=new URL(req.url),videoId=requestUrl.searchParams.get('video_id')||'',token=requestUrl.searchParams.get('token')||'';
  if(!videoId||!await verifyToken(token,videoId,serviceKey))return json(req,{error:'Invalid or expired playback token'},401);
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  const {data:job,error:jobError}=await admin.from('media_processing_jobs').select('archive_manifest_path').eq('video_id',videoId).eq('status','ready').order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if(jobError||!job?.archive_manifest_path)return json(req,{error:'Adaptive media unavailable'},404);
  const archive=String(job.archive_manifest_path);
  const root=archive.slice(0,archive.lastIndexOf('/')+1);
  const requested=requestUrl.searchParams.get('path')||archive.slice(root.length);
  if(!safePlaylist(requested))return json(req,{error:'Invalid playlist path'},400);
  const storagePath=root+requested;
  const {data:file,error:fileError}=await admin.storage.from('velvet-media').download(storagePath);
  if(fileError||!file)return json(req,{error:'Playlist unavailable'},404);
  const lines=(await file.text()).split(/\r?\n/);
  if(requested==='master.m3u8'){
    const base=`${supabaseUrl}/functions/v1/get-hls-playlist?video_id=${encodeURIComponent(videoId)}&token=${encodeURIComponent(token)}`;
    for(let i=0;i<lines.length;i++)if(lines[i]&&!lines[i].startsWith('#')){
      if(!safePlaylist(lines[i])||lines[i]==='master.m3u8')return json(req,{error:'Unsafe playlist reference'},500);
      lines[i]=`${base}&path=${encodeURIComponent(lines[i])}`;
    }
  }else{
    const folder=requested.slice(0,requested.lastIndexOf('/')+1);
    const indexes:number[]=[],paths:string[]=[];
    for(let i=0;i<lines.length;i++)if(lines[i]&&!lines[i].startsWith('#')){
      if(!/^segment-\d{5}\.ts$/.test(lines[i]))return json(req,{error:'Unsafe segment reference'},500);
      indexes.push(i);paths.push(root+folder+lines[i]);
    }
    const {data:signed,error:signedError}=await admin.storage.from('velvet-media').createSignedUrls(paths,22500);
    if(signedError||!signed||signed.length!==paths.length)return json(req,{error:'Segments unavailable'},503);
    indexes.forEach((lineIndex,index)=>{const url=signed[index]?.signedUrl;if(url)lines[lineIndex]=url;});
    if(indexes.some(lineIndex=>!lines[lineIndex]?.startsWith('http')))return json(req,{error:'Segments unavailable'},503);
  }
  return new Response(lines.join('\n'),{status:200,headers:{...corsFor(req),'Content-Type':'application/vnd.apple.mpegurl','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
});
