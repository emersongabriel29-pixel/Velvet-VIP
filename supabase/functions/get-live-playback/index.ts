import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean);
const allowedHosts=new Set((Deno.env.get('STREAMING_ALLOWED_HOSTS')||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean));
const cors=(req:Request)=>{const origin=req.headers.get('Origin')||'';return {'Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}};
const json=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'no-store'}});
const safeUrl=(value:unknown)=>{if(typeof value!=='string'||!value)return null;try{const u=new URL(value);return u.protocol==='https:'&&allowedHosts.has(u.hostname.toLowerCase())?value:null}catch{return null}};

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
  if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
  const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!serviceKey)return json(req,{error:'Server not configured'},500);
  const auth=req.headers.get('Authorization');
  if(!auth?.startsWith('Bearer '))return json(req,{error:'Authentication required'},401);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(auth.slice(7));
  if(authError||!user)return json(req,{error:'Invalid session'},401);
  const body=await req.json().catch(()=>null);
  const liveId=body?.live_id;
  if(typeof liveId!=='string')return json(req,{error:'live_id required'},400);

  const {data:live,error:liveError}=await admin.from('live_sessions')
    .select('id,creator_id,title,status,moderation_status,required_plan,streaming_provider,available_qualities')
    .eq('id',liveId).single();
  if(liveError||!live)return json(req,{error:'Live not found'},404);
  if(live.status!=='live'||live.moderation_status!=='approved')return json(req,{error:'Live unavailable'},409);

  const [{data:profile},{data:creator}]=await Promise.all([
    admin.from('profiles').select('age_verified,birth_date,is_blocked,is_suspended,role,platform_plan_id').eq('id',user.id).single(),
    admin.from('creators').select('user_id').eq('id',live.creator_id).single()
  ]);
  if(!profile?.age_verified||profile.is_blocked||profile.is_suspended||!profile.birth_date||new Date(profile.birth_date)>new Date(new Date().setFullYear(new Date().getFullYear()-18)))return json(req,{error:'18+ verification required'},403);

  let entitled=creator?.user_id===user.id||profile.role==='admin';
  if(!entitled&&profile.platform_plan_id){
    const {data:plan}=await admin.from('platform_plans').select('slug,is_active').eq('id',profile.platform_plan_id).maybeSingle();
    const rank:Record<string,number>={gratis:0,free:0,plus:1,vip:2};
    entitled=Boolean(plan?.is_active&&(rank[plan.slug]||0)>=(rank[live.required_plan]??0));
  }
  if(!entitled)return json(req,{error:'Required platform plan not active'},403);

  const {data:state,error:stateError}=await admin.rpc('get_live_stream_state',{p_live_id:liveId});
  if(stateError||!state)return json(req,{error:'Streaming provider not attached'},409);

  const sources:any[]=[];
  const ref=safeUrl(state.playback_reference);
  if(ref)sources.push({label:'Automático',url:ref,type:'application/vnd.apple.mpegurl'});
  for(const item of Array.isArray(state.playback_sources)?state.playback_sources:[]){
    const source=safeUrl(item?.url||item?.playback_reference);
    if(!source)continue;
    sources.push({label:String(item?.label||'Fonte').slice(0,20),url:source,type:String(item?.type||'application/vnd.apple.mpegurl').slice(0,80)});
  }
  const unique=sources.filter((x,i,a)=>i===a.findIndex(y=>y.label===x.label&&y.url===x.url));
  if(!unique.length)return json(req,{error:'No approved playback source configured'},503);
  return json(req,{live_id:live.id,title:live.title,provider:state.provider,sources:unique});
});
