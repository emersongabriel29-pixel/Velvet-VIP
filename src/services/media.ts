import { isDemoMode, isSupabaseConfigured, supabase } from '../lib/supabase';

const VIDEO_MIME = new Set(['video/mp4','video/webm','video/quicktime']);
const MAX_BYTES = 512 * 1024 * 1024;

const safeExt = (file: File) => {
  const ext=(file.name.split('.').pop()||'mp4').toLowerCase().replace(/[^a-z0-9]/g,'');
  return ext || 'mp4';
};

export async function uploadCreatorVideo(input:{
  file:File; thumbnail?:Blob|null; title:string; description:string; category:string; hashtags:string[];
  isPremium:boolean; premiumPrice:number; requiredTier:'free'|'basic'|'vip'; isDraft:boolean; contentKind:'short'|'long';
  durationSeconds:number; anonymousAccess:boolean; accessType:'free'|'subscription'|'pay_per_view';
}):Promise<{id:string;storagePath:string}>{
  if (!isSupabaseConfigured || !supabase) throw new Error(isDemoMode ? 'Upload real indisponível no modo demonstração.' : 'Supabase não configurado.');
  if (!VIDEO_MIME.has(input.file.type)) throw new Error('Formato inválido. Use MP4, WEBM ou MOV.');
  if (input.file.size<=0 || input.file.size>MAX_BYTES) throw new Error('O vídeo deve ter até 512 MB.');
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user) throw new Error('Faça login novamente antes de publicar.');
  const restricted=await supabase.rpc('has_active_restriction',{p_scope:'publish'});
  if(restricted.error) throw new Error('Não foi possível validar a permissão de publicação.');
  if(restricted.data===true) throw new Error('Sua conta está temporariamente impedida de publicar.');
  const {data:creator,error:creatorError}=await supabase.from('creators').select('id,is_approved').eq('user_id',user.id).single();
  if(creatorError||!creator?.is_approved) throw new Error('Somente criadores aprovados podem publicar.');

  const mediaId=crypto.randomUUID();
  const videoPath=`${user.id}/videos/${mediaId}.${safeExt(input.file)}`;
  const uploaded=await supabase.storage.from('velvet-media').upload(videoPath,input.file,{contentType:input.file.type,cacheControl:'3600',upsert:false});
  if(uploaded.error) throw new Error(`Falha no envio do vídeo: ${uploaded.error.message}`);

  let thumbRef='';
  try{
    if(input.thumbnail){
      const thumbPath=`${user.id}/thumbnails/${mediaId}.jpg`;
      const thumb=await supabase.storage.from('velvet-media').upload(thumbPath,input.thumbnail,{contentType:'image/jpeg',cacheControl:'3600',upsert:false});
      if(!thumb.error) thumbRef=`storage://${thumbPath}`;
    }
    const inserted=await supabase.from('videos').insert({
      creator_id:creator.id,title:input.title,description:input.description,
      video_url:`storage://${videoPath}`,thumbnail_url:thumbRef,
      duration_seconds:Math.max(1,Math.round(input.durationSeconds||1)),
      aspect_ratio:input.contentKind==='long'?'16:9':'9:16',
      content_kind:input.contentKind,is_premium:input.isPremium,
      premium_price:input.isPremium?input.premiumPrice:0,
      required_tier:input.isPremium?input.requiredTier:'free',
      category:input.category,hashtags:input.hashtags,is_draft:input.isDraft,
      access_type:input.accessType,content_level:'sensual',anonymous_access:input.anonymousAccess
    }).select('id').single();
    if(inserted.error||!inserted.data) throw new Error(inserted.error?.message||'Falha ao registrar o vídeo.');
    return {id:inserted.data.id,storagePath:videoPath};
  }catch(err){
    await supabase.storage.from('velvet-media').remove([videoPath]);
    throw err;
  }
}

export async function getPlayableVideoUrl(videoId:string):Promise<string>{
  if(!supabase) throw new Error('Supabase não configurado.');
  const {data,error}=await supabase.functions.invoke('get-video-url',{body:{video_id:videoId}});
  if(error||!data?.url) throw new Error(data?.error||error?.message||'Não foi possível liberar o vídeo.');
  return data.url;
}


const IMAGE_MIME = new Set(['image/jpeg','image/png','image/webp']);
const MAX_PROFILE_IMAGE_BYTES = 8 * 1024 * 1024;

export async function uploadProfileImage(file:File, kind:'avatar'|'cover'):Promise<string>{
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado.');
  if (!IMAGE_MIME.has(file.type)) throw new Error('Use uma imagem JPG, PNG ou WEBP.');
  if (file.size<=0 || file.size>MAX_PROFILE_IMAGE_BYTES) throw new Error('A imagem deve ter até 8 MB.');
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user) throw new Error('Faça login novamente.');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=`${user.id}/profile/${kind}-${crypto.randomUUID()}.${ext}`;
  const uploaded=await supabase.storage.from('velvet-media').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
  if(uploaded.error) throw new Error(`Falha ao enviar imagem: ${uploaded.error.message}`);
  return `storage://${path}`;
}

export async function getProfileImageUrl(ref:string):Promise<string>{
  if(!ref?.startsWith('storage://')) return ref || '';
  if(!supabase) return '';
  const path=ref.slice('storage://'.length);
  const {data,error}=await supabase.storage.from('velvet-media').createSignedUrl(path,3600);
  return error ? '' : data.signedUrl;
}
