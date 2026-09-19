import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  Check,
  Plus,
  Lock,
  Play,
  Grid,
  Heart,
  Bookmark,
  Settings,
  ShoppingBag,
  LayoutDashboard,
  ShieldCheck,
  Wallet,
  Scale,
  LogIn,
  Camera,
  Share2,
  Radio,
  ArrowLeft
} from 'lucide-react';
import { Creator, Video } from '../../types';
import { dbService } from '../../services/db';
import { useAuth } from '../../hooks/useAuth';
import { SubscribeModal } from '../creator/SubscribeModal';
import { isDemoMode, isSupabaseConfigured, supabase } from '../../lib/supabase';
import { uploadProfileImage, getProfileImageUrl } from '../../services/media';

interface ProfileViewProps {
  creatorId?: string; // If passed, views that creator. If undefined, views current logged-in user!
  onSelectVideo: (videoId: string) => void;
  onOpenCreatorStudio: () => void;
  onOpenMyPurchases: () => void;
  onOpenWallet: () => void;
  onOpenUpload: () => void;
  onOpenLgpd?: () => void;
  onOpenAuth?: () => void;
  onOpenLive?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  creatorId,
  onSelectVideo,
  onOpenCreatorStudio,
  onOpenMyPurchases,
  onOpenWallet,
  onOpenUpload,
  onOpenLgpd,
  onOpenAuth,
  onOpenLive,
}) => {
  const { currentUser, currentCreator, isAuthenticated, updateProfile } = useAuth();
  const [creator, setCreator] = useState<Creator | undefined>(undefined);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'free' | 'vip' | 'long' | 'favorites'>('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLives, setProfileLives] = useState<any[]>([]);
  const [profileHighlights,setProfileHighlights]=useState<any[]>([]);
  const [selectedHighlight,setSelectedHighlight]=useState<any|null>(null);

  const isOwnProfile = isAuthenticated && (!creatorId || (currentCreator && currentCreator.id === creatorId) || (creator && creator.user_id === currentUser.id));

  useEffect(() => {
    let cancelled=false;
    (async()=>{
      let targetCreator: Creator | undefined;
      try{
        if(isSupabaseConfigured && supabase){
          if(creatorId){
            const {data,error}=await supabase.from('creators').select('*').eq('id',creatorId).maybeSingle();
            if(error) throw error;
            targetCreator=(data||undefined) as Creator|undefined;
          }else if(currentCreator){
            targetCreator=currentCreator;
          }

          if(targetCreator){
            const {data,error}=await supabase.from('videos').select('*').eq('creator_id',targetCreator.id).eq('is_removed',false).order('created_at',{ascending:false});
            if(error) throw error;
            const vList=await Promise.all((data||[]).map(async (v:any)=>({...v,thumbnail_url:await getProfileImageUrl(v.thumbnail_url||'')})));
            if(!cancelled) setVideos(vList as Video[]);
            if(isAuthenticated){
              const {data:follow}=await supabase.from('follows').select('id').eq('follower_id',currentUser.id).eq('creator_id',targetCreator.id).maybeSingle();
              if(!cancelled) setIsFollowing(Boolean(follow));
            }else if(!cancelled) setIsFollowing(false);
          }else if(isAuthenticated){
            const {data:favs}=await supabase.from('favorites').select('video_id').eq('user_id',currentUser.id);
            const ids=(favs||[]).map((x:any)=>x.video_id);
            if(ids.length){
              const {data}=await supabase.from('videos').select('*').in('id',ids);
              const resolved=await Promise.all((data||[]).map(async (v:any)=>({...v,thumbnail_url:await getProfileImageUrl(v.thumbnail_url||'')})));
              if(!cancelled) setVideos(resolved as Video[]);
            }else if(!cancelled) setVideos([]);
          }else if(!cancelled) setVideos([]);
        }else if(isDemoMode){
          targetCreator=creatorId?dbService.getCreatorById(creatorId):(currentCreator||undefined);
          if(targetCreator){setVideos(dbService.getVideosByCreator(targetCreator.id));setIsFollowing(dbService.isFollowing(targetCreator.id));}
          else setVideos(dbService.getFavorites());
        }else{
          throw new Error('Backend de produção indisponível.');
        }
        if(!cancelled){
          setCreator(targetCreator);
          setNameInput(targetCreator?.display_name||currentUser.name);
          setBioInput(targetCreator?.bio||currentUser.bio||'');
          const [a,cv]=await Promise.all([getProfileImageUrl(targetCreator?.avatar_url||currentUser.avatar_url||''),getProfileImageUrl(targetCreator?.cover_url||'')]);
          if(!cancelled){setAvatarPreview(a);setCoverPreview(cv);}
        }
      }catch(err:any){if(!cancelled)setProfileError(err?.message||'Não foi possível carregar o perfil.');}
    })();
    return()=>{cancelled=true};
  }, [creatorId, currentCreator?.id, currentUser.id, isAuthenticated]);

  const handleToggleFollow = async () => {
    if (!creator || !isAuthenticated) return;
    if(isDemoMode){
      const nowF=dbService.toggleFollow(creator.id); setIsFollowing(nowF); setCreator(dbService.getCreatorById(creator.id)); return;
    }
    if(!supabase){setProfileError('Backend de produção indisponível.');return;}
    if(isFollowing){
      const {error}=await supabase.from('follows').delete().eq('follower_id',currentUser.id).eq('creator_id',creator.id);
      if(!error){setIsFollowing(false);setCreator(prev=>prev?{...prev,total_followers:Math.max(0,(prev.total_followers||0)-1)}:prev);}
    }else{
      const {error}=await supabase.from('follows').insert({follower_id:currentUser.id,creator_id:creator.id});
      if(!error){setIsFollowing(true);setCreator(prev=>prev?{...prev,total_followers:(prev.total_followers||0)+1}:prev);}
    }
  };

  useEffect(() => {
    if (!creator?.id || !isSupabaseConfigured || !supabase) { setProfileLives([]); return; }
    supabase.from('live_sessions').select('id,title,status,scheduled_at,required_plan').eq('creator_id',creator.id).in('status',['live','scheduled']).order('scheduled_at',{ascending:true}).then(({data})=>setProfileLives(data || []));
    supabase.from('creator_highlights').select('id,title,cover_url,media_url,media_type').eq('creator_id',creator.id).eq('is_active',true).order('sort_order').order('created_at',{ascending:false}).then(async ({data})=>{const rows=await Promise.all((data||[]).map(async h=>({...h,display_url:await getProfileImageUrl(h.cover_url||h.media_url||'')})));setProfileHighlights(rows);});
  }, [creator?.id]);

  const pickImage = (file:File|undefined, kind:'avatar'|'cover') => {
    if(!file) return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8*1024*1024){ setProfileError('Use JPG, PNG ou WEBP com até 8 MB.'); return; }
    const url=URL.createObjectURL(file);
    if(kind==='avatar'){setAvatarFile(file);setAvatarPreview(url);}else{setCoverFile(file);setCoverPreview(url);}
    setProfileError('');
  };

  const handleSaveProfile = async () => {
    if (!avatarPreview && !currentUser.avatar_url && !creator?.avatar_url) { setProfileError('A foto de perfil é obrigatória.'); return; }
    setSavingProfile(true); setProfileError('');
    try {
      let avatarRef=currentUser.avatar_url;
      if(avatarFile) avatarRef=isSupabaseConfigured ? await uploadProfileImage(avatarFile,'avatar') : avatarPreview;
      await updateProfile({ name:nameInput, bio:bioInput, avatar_url:avatarRef });
      if(creator && isSupabaseConfigured && supabase){
        let coverRef=creator.cover_url || '';
        if(coverFile) coverRef=await uploadProfileImage(coverFile,'cover');
        const {error}=await supabase.from('creators').update({display_name:nameInput,bio:bioInput,avatar_url:avatarRef,cover_url:coverRef}).eq('id',creator.id);
        if(error) throw error;
        setCreator(prev=>prev?{...prev,display_name:nameInput,bio:bioInput,avatar_url:avatarRef,cover_url:coverRef}:prev);
      } else if(creator && isDemoMode) {
        dbService.updateCreator(creator.id,{display_name:nameInput,bio:bioInput,avatar_url:avatarRef,cover_url:coverPreview || creator.cover_url});
      } else if(creator) {
        throw new Error('Backend de produção indisponível.');
      }
      setAvatarFile(null); setCoverFile(null); setIsEditingBio(false);
    } catch(err:any){ setProfileError(err?.message || 'Não foi possível salvar o perfil.'); }
    finally { setSavingProfile(false); }
  };

  const shareProfile = async () => {
    const url=`${window.location.origin}${window.location.pathname}#creator=${creator?.id || currentUser.id}`;
    const data={title:creator?.display_name || currentUser.name,text:`Veja o perfil de ${creator?.display_name || currentUser.name} no Velvet VIP`,url};
    try { if(navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(url); alert('Link do perfil copiado.'); } } catch {}
  };

  // Filter videos according to tab
  const displayedVideos = videos.filter((v) => {
    if (activeTab === 'free') return !v.is_premium;
    if (activeTab === 'vip') return v.is_premium;
    if (activeTab === 'long') return v.content_kind === 'long' || v.duration_seconds >= 60;
    return true;
  });

  if (isOwnProfile && isEditingBio) {
    return (
      <div id="profile-settings-screen" className="min-h-screen bg-[#09090b] text-white pt-16 pb-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="mb-6 flex items-center gap-3 border-b border-zinc-800 pb-5">
            <button type="button" onClick={()=>setIsEditingBio(false)} className="touch-manipulation rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-300 hover:text-white" aria-label="Voltar ao perfil"><ArrowLeft className="h-5 w-5"/></button>
            <div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-rose-400">Configurações</p><h1 className="text-xl font-black sm:text-2xl">Editar perfil</h1></div>
          </div>
          <div className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6">
            {profileError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300">{profileError}</p>}
            <div className="relative h-36 overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/60 via-zinc-900 to-amber-950/40 border border-zinc-800">
              {coverPreview && <img src={coverPreview} alt="Prévia da capa" className="h-full w-full object-cover opacity-70"/>}
              <label className="absolute bottom-3 right-3 cursor-pointer rounded-xl bg-black/70 px-3 py-2 text-xs font-bold"><Camera className="mr-1.5 inline h-4 w-4"/>Alterar capa<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>pickImage(e.target.files?.[0],'cover')}/></label>
            </div>
            <div className="flex items-center gap-4">
              <img src={avatarPreview || creator?.avatar_url || currentUser.avatar_url || 'https://placehold.co/256x256?text=Foto'} alt="Foto do perfil" className="h-24 w-24 rounded-3xl border-2 border-zinc-700 object-cover"/>
              <div><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold"><Camera className="h-4 w-4"/>Alterar foto<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>pickImage(e.target.files?.[0],'avatar')}/></label><p className="mt-2 text-[11px] text-zinc-500">Foto obrigatória • JPG, PNG ou WEBP • até 8 MB</p></div>
            </div>
            <div><label className="mb-1.5 block text-xs font-semibold text-zinc-400">Nome</label><input type="text" value={nameInput} onChange={e=>setNameInput(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"/></div>
            <div><label className="mb-1.5 block text-xs font-semibold text-zinc-400">Biografia</label><textarea rows={4} value={bioInput} onChange={e=>setBioInput(e.target.value)} className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-rose-500"/></div>
            <div className="flex gap-3 border-t border-zinc-800 pt-4"><button type="button" onClick={()=>setIsEditingBio(false)} className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300">Cancelar</button><button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{savingProfile?'Salvando...':'Salvar alterações'}</button></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-14 pb-20 max-w-4xl mx-auto px-3 sm:px-6">
      {/* Cover Banner */}
      <div className="relative h-44 sm:h-56 rounded-3xl overflow-hidden bg-gradient-to-r from-rose-950/60 via-zinc-900 to-amber-950/40 border border-zinc-800 shadow-xl mb-16">
        {coverPreview && (
          <img
            src={coverPreview}
            alt="Cover"
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
        )}
        {!coverPreview && <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="text-2xl sm:text-3xl font-black">VELVET <span className="text-rose-500">VIP</span></div><div className="mt-1 text-[10px] font-bold uppercase tracking-[.3em] text-zinc-500">Conteúdo exclusivo 18+</div></div></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />

        {/* Action button on top right of cover */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {isOwnProfile ? (
            <button
              type="button"
              aria-expanded={isEditingBio}
              aria-controls="profile-settings-screen"
              onClick={() => setIsEditingBio(true)}
              className="relative z-20 touch-manipulation p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Editar Perfil</span>
            </button>
          ) : (
            <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-rose-400 font-bold text-xs flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Criador Verificado 18+</span>
            </div>
          )}
        </div>

        {/* Floating Avatar */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-end gap-4">
          <div className="relative">
            <img
              src={avatarPreview || creator?.avatar_url || currentUser.avatar_url || 'https://placehold.co/256x256?text=Foto'}
              alt="Avatar"
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 shadow-2xl bg-zinc-800 ${profileLives.some(l => l.status === "live") ? "border-rose-500 ring-4 ring-rose-500/25" : "border-[#09090b]"}`}
              referrerPolicy="no-referrer"
            />
            {profileLives.some(l => l.status === "live") && <button type="button" onClick={onOpenLive} className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-rose-600 px-3 py-1 text-[10px] font-black text-white shadow-lg">AO VIVO</button>}
            {creator?.verified && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 border-2 border-[#09090b] flex items-center justify-center text-white shadow">
                <Crown className="w-4 h-4 fill-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Header Info */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 font-display">
              {creator?.display_name || currentUser.name}
              <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
            </h1>
            <p className="text-sm text-zinc-400">
              @{creator?.handle || currentUser.username} •{' '}
              <span className="text-zinc-500 capitalize">{currentUser.role}</span>
            </p>
          </div>

          {/* Profile CTA Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={shareProfile} className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold text-xs flex items-center gap-1.5"><Share2 className="w-4 h-4" /> Compartilhar perfil</button>
            {isOwnProfile ? (
              <>
                {currentUser.role === 'creator' && currentCreator?.is_approved === true && (
                  <button
                    onClick={onOpenCreatorStudio}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/40 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Painel do Criador</span>
                  </button>
                )}

                <button
                  onClick={onOpenMyPurchases}
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Minhas Compras</span>
                </button>

                <button
                  onClick={onOpenWallet}
                  className="basis-full w-full px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left flex items-center gap-3 transition-colors cursor-pointer"
                  title="Minha Carteira"
                >
                  <Wallet className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[11px] font-medium text-zinc-400">Minha Carteira</span>
                    <span className="text-sm font-bold text-amber-400">R$ {currentUser.wallet_balance.toFixed(2).replace('.', ',')}</span>
                  </span>
                  <span className="ml-auto text-zinc-500 text-lg">›</span>
                </button>

                {(currentUser.role === 'admin' || (currentUser.role === 'creator' && currentCreator?.is_approved === true)) && (
                  <button
                    onClick={onOpenUpload}
                    className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Postar Vídeo</span>
                  </button>
                )}

                {onOpenLgpd && (
                  <button
                    onClick={onOpenLgpd}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Seus Direitos e Dados Pessoais (LGPD Art. 18)"
                  >
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>LGPD & Dados</span>
                  </button>
                )}

                {onOpenAuth && (
                  <button
                    onClick={onOpenAuth}
                    className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Alternar Conta ou Fazer Login"
                  >
                    <LogIn className="w-4 h-4 text-rose-400" />
                    <span>Trocar Conta</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleToggleFollow}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                    isFollowing
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                      <span>Seguindo</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Seguir</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSubscribeModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/50 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Crown className="w-4 h-4 fill-white" />
                  <span>Assinar a partir de R$ {(creator?.subscription_price_basic || 29.90).toFixed(2).replace('.', ',')}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
          {creator?.bio || currentUser.bio || 'Criador exclusivo na plataforma Velvet VIP.'}
        </p>

        {/* Statistics Bar */}
        <div className="flex items-center gap-6 py-3 border-y border-zinc-800/80 text-xs">
          <div>
            <strong className="text-white font-bold text-sm block">
              {creator ? (creator.total_followers > 1000 ? `${(creator.total_followers / 1000).toFixed(1)}k` : creator.total_followers) : 0}
            </strong>
            <span className="text-zinc-500">Seguidores</span>
          </div>

          <div>
            <strong className="text-white font-bold text-sm block">
              {creator ? (creator.total_likes > 1000 ? `${(creator.total_likes / 1000).toFixed(1)}k` : creator.total_likes) : 0}
            </strong>
            <span className="text-zinc-500">Curtidas</span>
          </div>

          <div>
            <strong className="text-white font-bold text-sm block">
              {videos.length}
            </strong>
            <span className="text-zinc-500">Vídeos Verticais</span>
          </div>

          {creator && (
            <div>
              <strong className="text-white font-bold text-sm block">
                {creator.total_views > 1000 ? `${(creator.total_views / 1000).toFixed(1)}k` : creator.total_views}
              </strong>
              <span className="text-zinc-500">Visualizações</span>
            </div>
          )}
        </div>
      </div>

      {creator && (profileLives.length > 0 || profileHighlights.length > 0) && <section className="mb-6"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold flex items-center gap-2"><Radio className="w-4 h-4 text-rose-500"/>Lives e destaques</h2>{profileLives.length>0&&onOpenLive&&<button onClick={onOpenLive} className="text-xs text-rose-400">Ver lives</button>}</div><div className="flex gap-4 overflow-x-auto pb-2">{profileLives.map(l=><button key={l.id} onClick={onOpenLive} className="w-24 shrink-0 text-center"><div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 ${l.status==='live'?'border-rose-500 bg-rose-950/30':'border-amber-500 bg-zinc-900'}`}><Radio className={`h-7 w-7 ${l.status==='live'?'text-rose-400':'text-amber-300'}`}/></div><p className="mt-2 truncate text-xs font-bold">{l.status==='live'?'AO VIVO':l.title}</p></button>)}{profileHighlights.map(h=><button key={h.id} onClick={()=>setSelectedHighlight(h)} className="w-24 shrink-0 text-center"><div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-zinc-700 bg-zinc-900">{h.display_url&&<img src={h.display_url} alt={h.title} className="h-full w-full object-cover"/>}</div><p className="mt-2 truncate text-xs font-bold">{h.title}</p></button>)}</div></section>}

      {selectedHighlight&&<div onClick={()=>setSelectedHighlight(null)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"><div onClick={e=>e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-[#111116] shadow-2xl">{selectedHighlight.media_type==='video'?<video src={selectedHighlight.display_url} controls autoPlay playsInline className="max-h-[70vh] w-full bg-black object-contain"/>:<img src={selectedHighlight.display_url} alt={selectedHighlight.title} className="max-h-[70vh] w-full bg-black object-contain"/>}<div className="flex items-center justify-between gap-3 p-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-rose-400">Destaque</p><h3 className="font-bold">{selectedHighlight.title}</h3></div><button onClick={()=>setSelectedHighlight(null)} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold">Fechar</button></div></div></div>}

      {/* Profile Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-800 pb-3 mb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Todos ({videos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('free')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'free'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Gratuitos</span>
        </button>

        <button
          onClick={() => setActiveTab('vip')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'vip'
              ? 'bg-gradient-to-r from-rose-950/60 to-amber-950/40 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Exclusivos VIP</span>
        </button>
        <button
          onClick={() => setActiveTab('long')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${activeTab === 'long' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Vídeos longos</span>
        </button>
      </div>

      {/* Videos Grid */}
      {displayedVideos.length === 0 ? (
        <div className="py-16 text-center text-zinc-500">
          <Grid className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
          <p className="text-sm font-semibold text-zinc-400">Nenhum vídeo nesta aba</p>
          <p className="text-xs mt-1">Este perfil ainda não adicionou vídeos para este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {displayedVideos.map((v) => (
            <div
              key={v.id}
              onClick={() => onSelectVideo(v.id)}
              className={`group relative ${v.content_kind === 'long' || v.duration_seconds >= 60 ? 'aspect-video col-span-2 sm:col-span-2' : 'aspect-[9/16]'} rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer shadow-md`}
            >
              <img
                src={v.thumbnail_url}
                alt={v.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              {/* VIP Badge */}
              {v.is_premium && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/80 backdrop-blur-md text-zinc-950 text-[10px] font-black uppercase flex items-center gap-1 shadow">
                  <Lock className="w-2.5 h-2.5" />
                  <span>VIP</span>
                </div>
              )}

              {/* Views Count */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[11px] font-semibold text-white filter drop-shadow">
                <Play className="w-3 h-3 fill-white" />
                <span>{v.views_count > 1000 ? `${(v.views_count / 1000).toFixed(1)}k` : v.views_count}</span>
              </div>

              {/* Likes Count */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[11px] font-semibold text-zinc-300 filter drop-shadow">
                <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                <span>{v.likes_count > 1000 ? `${(v.likes_count / 1000).toFixed(1)}k` : v.likes_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscribe Modal */}
      {creator && (
        <SubscribeModal
          creator={creator}
          isOpen={subscribeModalOpen}
          onClose={() => setSubscribeModalOpen(false)}
        />
      )}
    </div>
  );
};
