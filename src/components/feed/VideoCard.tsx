import React, { useRef, useState, useEffect } from 'react';
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  MoreVertical,
  Plus,
  Check,
  Volume2,
  VolumeX,
  Lock,
  Crown,
  Sparkles,
  Maximize2,
  Settings
} from 'lucide-react';
import { Video } from '../../types';
import { dbService } from '../../services/db';
import { getVideoPlaybackOptions, PlaybackSource } from '../../services/media';
import { supabase, isSupabaseConfigured, isDemoMode } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { AdaptiveVideo } from '../common/AdaptiveVideo';

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenComments: (video: Video) => void;
  onOpenShare: (video: Video) => void;
  onOpenReport: (video: Video) => void;
  onOpenSubscribe: (video: Video) => void;
  onSelectCreator: (creatorId: string) => void;
  onTagClick?: (tag: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isActive,
  isMuted,
  onToggleMute,
  onOpenComments,
  onOpenShare,
  onOpenReport,
  onOpenSubscribe,
  onSelectCreator,
  onTagClick,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [hasLiked, setHasLiked] = useState(Boolean(video.has_liked));
  const [hasFavorited, setHasFavorited] = useState(Boolean(video.has_favorited));
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [expandDesc, setExpandDesc] = useState(false);
  const [showQuality,setShowQuality]=useState(false);
  const [quality,setQuality]=useState('Automático');
  const [playbackSources,setPlaybackSources]=useState<PlaybackSource[]>([]);
  const [playbackUrl, setPlaybackUrl] = useState(video.video_url.startsWith('storage://') ? '' : video.video_url);
  const [playbackType,setPlaybackType]=useState('video/mp4');
  const [hlsQualities,setHlsQualities]=useState<number[]>([]);
  const [qualityHeight,setQualityHeight]=useState<number|null>(null);
  const lastTapRef = useRef<number>(0);
  const canPlayback = !video.is_premium || Boolean(video.has_unlocked);
  const isLocked = video.is_premium && !video.has_unlocked;

  useEffect(() => {
    let cancelled=false;
    (async()=>{
      if(isDemoMode){
        if(!cancelled){
          setIsFollowing(video.creator_id?dbService.isFollowing(video.creator_id):false);
          setHasLiked(Boolean(video.has_liked));
          setHasFavorited(Boolean(video.has_favorited));
        }
        return;
      }
      if(!isAuthenticated){
        if(!cancelled){setIsFollowing(false);setHasLiked(false);setHasFavorited(false);}
        return;
      }
      const [like,fav,follow]=await Promise.all([
        supabase.from('video_likes').select('id').eq('video_id',video.id).eq('user_id',currentUser.id).maybeSingle(),
        supabase.from('favorites').select('id').eq('video_id',video.id).eq('user_id',currentUser.id).maybeSingle(),
        supabase.from('follows').select('id').eq('creator_id',video.creator_id).eq('follower_id',currentUser.id).maybeSingle()
      ]);
      if(!cancelled){setHasLiked(Boolean(like.data));setHasFavorited(Boolean(fav.data));setIsFollowing(Boolean(follow.data));}
    })();
    return()=>{cancelled=true};
  }, [video.id, video.creator_id, currentUser.id, isAuthenticated]);

  useEffect(() => {
    setLikesCount(video.likes_count);
  }, [video.likes_count]);

  useEffect(() => {
    let cancelled=false;
    setPlaybackSources([]);
    setQuality('Automático');
    setPlaybackUrl(video.video_url.startsWith('storage://') ? '' : video.video_url);
    setPlaybackType('video/mp4');
    setHlsQualities([]);
    setQualityHeight(null);
    if (video.video_url.startsWith('storage://') && canPlayback) {
      getVideoPlaybackOptions(video.id).then(data=>{
        if(cancelled)return;
        const automatic=data.sources.find(source=>source.label==='Automático')||data.sources[0];
        setPlaybackUrl(automatic?.url||data.url);
        setPlaybackType(automatic?.type||'video/mp4');
        setPlaybackSources(data.sources);
      }).catch(()=>{if(!cancelled){setPlaybackUrl('');setPlaybackType('video/mp4');setPlaybackSources([]);}});
    } else if(!video.video_url.startsWith('storage://') && video.video_url){
      setPlaybackSources([{label:'Automático',height:0,url:video.video_url,type:'video/mp4'}]);
    }
    return ()=>{cancelled=true;};
  }, [video.id, video.video_url, canPlayback]);

  // Handle Play/Pause when card becomes active/inactive
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive && canPlayback) {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log('Autoplay prevented or pending', err);
            setIsPlaying(false);
          });
      }
      if(supabase){
        if(isAuthenticated) void supabase.rpc('record_video_view',{p_video_id:video.id,p_duration_seconds:0});
      }else if(isDemoMode) dbService.recordView(video.id);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [isActive, canPlayback, video.id, isAuthenticated]);

  // Synchronize mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Track playback time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 1;
      const isLong = video.content_kind === 'long' || video.duration_seconds >= 60;
      const previewLimit = 15;
      if (isLong && current >= previewLimit) { videoRef.current.currentTime = 0; setProgress(0); return; }
      setProgress((current / (isLong ? Math.min(duration, previewLimit) : duration)) * 100);
    }
  };

  // Tap to toggle play/pause or double tap to like
  const handleScreenClick = (e: React.MouseEvent) => {
    // If clicking overlays, ignore
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      if (!hasLiked) {
        handleLike();
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
    } else {
      // Single tap -> toggle playback
      if (videoRef.current && canPlayback) {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          videoRef.current.play();
          setIsPlaying(true);
        }
      }
    }
    lastTapRef.current = now;
  };

  const handleLike = async () => {
    if(isDemoMode){
      const res=dbService.toggleLike(video.id);setHasLiked(res.hasLiked);setLikesCount(res.count);return;
    }
    if(!isAuthenticated)return;
    const previous=hasLiked;
    setHasLiked(!previous);setLikesCount(v=>Math.max(0,v+(previous?-1:1)));
    const {data,error}=await supabase.rpc('toggle_video_like',{p_video_id:video.id});
    if(error){setHasLiked(previous);setLikesCount(v=>Math.max(0,v+(previous?1:-1)));return;}
    setHasLiked(Boolean(data));
  };

  const handleFavorite = async () => {
    if(isDemoMode){setHasFavorited(dbService.toggleFavorite(video.id));return;}
    if(!isAuthenticated)return;
    const previous=hasFavorited;setHasFavorited(!previous);
    const {data,error}=await supabase.rpc('toggle_video_favorite',{p_video_id:video.id});
    if(error)setHasFavorited(previous);else setHasFavorited(Boolean(data));
  };

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!video.creator_id) return;
    if(isDemoMode){setIsFollowing(dbService.toggleFollow(video.creator_id));return;}
    if(!isAuthenticated)return;
    const previous=isFollowing;setIsFollowing(!previous);
    const {data,error}=await supabase.rpc('toggle_creator_follow',{p_creator_id:video.creator_id});
    if(error)setIsFollowing(previous);else setIsFollowing(Boolean(data));
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  };

  const automaticSource=playbackSources.find(source=>source.label==='Automático')||playbackSources[0];
  const manualSources=playbackSources.filter(source=>source.label!=='Automático'&&!String(source.type).toLowerCase().includes('mpegurl'));
  const showQualitySelector=hlsQualities.length>0||manualSources.length>0;
  const selectAutomatic=()=>{
    setQuality('Automático');setQualityHeight(null);
    if(automaticSource){setPlaybackUrl(automaticSource.url);setPlaybackType(automaticSource.type);}
    setShowQuality(false);
  };
  const selectHlsQuality=(height:number)=>{setQuality(`${height}p`);setQualityHeight(height);setShowQuality(false);};

  return (
    <div
      id={`video-slide-${video.id}`}
      className="relative w-full h-[100dvh] sm:h-[88vh] sm:max-h-[860px] sm:max-w-[420px] mx-auto bg-black overflow-hidden sm:rounded-3xl border sm:border-zinc-800 shadow-2xl flex items-center justify-center snap-start"
    >
      {/* Video element or Locked Blurred Backdrop */}
      <div
        className="w-full h-full relative cursor-pointer select-none"
        onClick={handleScreenClick}
      >
        <AdaptiveVideo
          ref={videoRef}
          sourceUrl={playbackUrl || undefined}
          sourceType={playbackType}
          qualityHeight={qualityHeight}
          onQualities={setHlsQualities}
          poster={video.thumbnail_url}
          loop
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          className={`w-full h-full object-cover transition-filter duration-300 ${
            isLocked ? 'filter blur-2xl brightness-50 scale-105' : ''
          }`}
        />

        {(video.content_kind === 'long' || video.duration_seconds >= 60) && <div className="absolute top-16 sm:top-4 left-4 z-30 flex items-center gap-2"><div className="rounded-lg bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">PRÉVIA • 15s • VÍDEO LONGO</div>{showQualitySelector&&<div className="relative"><button onClick={(e)=>{e.stopPropagation();setShowQuality(v=>!v)}} className="rounded-lg bg-black/60 p-1.5 text-white backdrop-blur-md" title="Qualidade"><Settings className="h-3.5 w-3.5"/></button>{showQuality&&<div onClick={e=>e.stopPropagation()} className="absolute left-0 mt-1 w-32 rounded-xl border border-white/10 bg-black/95 p-1 shadow-xl"><button onClick={selectAutomatic} className={`block w-full rounded-lg px-2 py-1.5 text-left text-[10px] ${quality==='Automático'?'bg-rose-600 text-white':'text-zinc-300 hover:bg-white/10'}`}>Automático</button>{hlsQualities.map(height=><button key={height} onClick={()=>selectHlsQuality(height)} className={`block w-full rounded-lg px-2 py-1.5 text-left text-[10px] ${quality===height+'p'?'bg-rose-600 text-white':'text-zinc-300 hover:bg-white/10'}`}>{height}p</button>)}{manualSources.map(src=><button key={src.label+src.url} onClick={()=>{setQuality(src.label);setQualityHeight(null);setPlaybackUrl(src.url);setPlaybackType(src.type);setShowQuality(false)}} className={`block w-full rounded-lg px-2 py-1.5 text-left text-[10px] ${quality===src.label?'bg-rose-600 text-white':'text-zinc-300 hover:bg-white/10'}`}>{src.label}</button>)}</div>}</div>}</div>}

        {/* Double-tap heart burst animation */}
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-300">
            <Heart className="w-28 h-28 fill-rose-600 text-rose-500 filter drop-shadow-2xl animate-bounce" />
          </div>
        )}

        {/* Play / Pause indicator icon overlay when paused manually */}
        {!isPlaying && isActive && !isLocked && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-12 h-12 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white/90">
              <div className="w-0 h-0 border-y-[9px] border-y-transparent border-l-[15px] border-l-white ml-1" />
            </div>
          </div>
        )}

        {/* Top Video Controls: Sound & Fullscreen */}
        <div className="absolute top-16 sm:top-4 right-4 z-30 flex items-center gap-2">
          <button
            id={`toggle-sound-btn-${video.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/10 transition-transform active:scale-90 cursor-pointer"
            title={isMuted ? 'Ativar som' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-300" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
          </button>

          <button
            onClick={handleFullscreen}
            className="hidden sm:flex w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white items-center justify-center border border-white/10 transition-transform active:scale-90 cursor-pointer"
            title="Tela Cheia"
          >
            <Maximize2 className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        {/* Locked Content Paywall Overlay */}
        {isLocked && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-md"
          >
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-rose-600 to-amber-500 p-0.5 shadow-2xl shadow-rose-950/80 mb-4 animate-pulse">
              <div className="w-full h-full bg-[#14141a] rounded-3xl flex items-center justify-center text-rose-500">
                <Lock className="w-8 h-8 stroke-[2.5]" />
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 font-extrabold text-[11px] uppercase tracking-wider mb-2">
              Conteúdo Exclusivo VIP
            </span>

            <h3 className="text-xl font-black text-white font-display leading-tight mb-2 max-w-xs">
              {video.title}
            </h3>

            <p className="text-zinc-300 text-xs max-w-xs mb-6 leading-relaxed">
              Este vídeo foi publicado na área restrita de{' '}
              <strong className="text-white">@{video.creator?.handle}</strong>. Assine o canal ou compre o acesso avulso para assistir agora.
            </p>

            <div className="w-full max-w-xs space-y-2.5">
              <button
                id={`unlock-video-btn-${video.id}`}
                onClick={() => onOpenSubscribe(video)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-950/60 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Crown className="w-4 h-4 fill-white" />
                <span>Desbloquear Vídeo • R$ {(video.premium_price || 19.90).toFixed(2).replace('.', ',')}</span>
              </button>

              <button
                onClick={() => onOpenSubscribe(video)}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Ver Planos de Assinatura Mensal
              </button>
            </div>
          </div>
        )}

        {/* Right Interaction Sidebar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 bottom-24 sm:bottom-20 z-20 flex flex-col items-center gap-3 text-white"
        >
          {/* Creator Avatar with Follow button */}
          <div className="relative mb-2">
            <button
              onClick={() => video.creator && onSelectCreator(video.creator.id)}
              className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-rose-500 to-amber-400 cursor-pointer group"
            >
              <img
                src={video.creator?.avatar_url || video.thumbnail_url}
                alt={video.creator?.display_name || 'Creator'}
                className="w-full h-full rounded-full object-cover border border-black group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
            </button>

            {/* Follow (+) button */}
            <button
              id={`follow-creator-btn-${video.id}`}
              onClick={handleToggleFollow}
              className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white transition-transform active:scale-90 cursor-pointer shadow-md ${
                isFollowing
                  ? 'bg-zinc-700 text-zinc-300'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {isFollowing ? <Check className="w-3 h-3 stroke-[3]" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
          </div>

          {/* Like Button */}
          <button
            id={`like-btn-${video.id}`}
            onClick={handleLike}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-75 ${
                hasLiked
                  ? 'bg-rose-600/30 text-rose-500'
                  : 'bg-black/40 text-white group-hover:bg-black/60'
              }`}
            >
              <Heart
                className={`w-6 h-6 transition-transform ${
                  hasLiked ? 'fill-rose-500 scale-110 text-rose-500' : 'text-white'
                }`}
              />
            </div>
            <span className="text-[11px] font-bold tracking-tight filter drop-shadow">
              {likesCount > 1000 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
            </span>
          </button>

          {/* Comments Button */}
          <button
            id={`comment-btn-${video.id}`}
            onClick={() => onOpenComments(video)}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-75">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold tracking-tight filter drop-shadow">
              {video.comments_count}
            </span>
          </button>

          {/* Favorite / Bookmark Button */}
          <button
            id={`favorite-btn-${video.id}`}
            onClick={handleFavorite}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-75 ${
                hasFavorited
                  ? 'bg-amber-500/30 text-amber-400'
                  : 'bg-black/40 text-white group-hover:bg-black/60'
              }`}
            >
              <Bookmark
                className={`w-6 h-6 ${hasFavorited ? 'fill-amber-400 text-amber-400' : 'text-white'}`}
              />
            </div>
            <span className="text-[11px] font-bold tracking-tight filter drop-shadow">
              {video.favorites_count}
            </span>
          </button>

          {/* Share Button */}
          <button
            id={`share-btn-${video.id}`}
            onClick={() => onOpenShare(video)}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-75">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold tracking-tight filter drop-shadow">
              Compartilhar
            </span>
          </button>

          {/* More Options / Report */}
          <button
            id={`more-opts-btn-${video.id}`}
            onClick={() => onOpenReport(video)}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
            title="Denunciar ou Opções"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Information Overlay */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 right-16 bottom-16 sm:bottom-4 p-4 z-20 text-white space-y-2 pointer-events-auto bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        >
          {/* Creator handle & Subscribe button */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => video.creator && onSelectCreator(video.creator.id)}
              className="flex items-center gap-1.5 font-extrabold text-sm hover:underline cursor-pointer font-display"
            >
              <span>{video.creator?.display_name || 'Criador Velvet'}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            </button>
            <span className="text-xs text-zinc-400">@{video.creator?.handle}</span>

            {/* Subscribe pill button if not user's own video */}
            {video.creator && (
              <button
                onClick={() => onOpenSubscribe(video)}
                className="px-2.5 py-0.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-[10px] tracking-wide uppercase transition-transform active:scale-95 cursor-pointer shadow"
              >
                Assinar
              </button>
            )}
          </div>

          {/* Title and Description */}
          <div className="text-xs text-zinc-200">
            <p className={`leading-relaxed ${expandDesc ? '' : 'line-clamp-2'}`}>
              <strong className="text-white block font-medium mb-0.5">{video.title}</strong>
              {video.description}
            </p>
            {video.description && video.description.length > 80 && (
              <button
                onClick={() => setExpandDesc(!expandDesc)}
                className="text-[10px] text-zinc-400 font-semibold hover:text-white mt-0.5 cursor-pointer"
              >
                {expandDesc ? 'Ver menos' : '...mais'}
              </button>
            )}
          </div>

          {/* Hashtags */}
          {video.hashtags && video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {(expandDesc ? video.hashtags : video.hashtags.slice(0, 3)).map((tag, idx) => (
                <span
                  key={idx}
                  onClick={() => onTagClick?.(tag)}
                  className="text-[11px] font-semibold text-rose-400/90 hover:text-rose-300 cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Premium tag pill */}
          {video.is_premium && expandDesc && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
              <Crown className="w-3 h-3 fill-amber-400" />
              <span>Vídeo Exclusivo VIP • R$ {(video.premium_price || 19.90).toFixed(2).replace('.', ',')}</span>
            </div>
          )}

          {/* Sound / Music track ticker */}
          <div className={`${expandDesc ? "flex" : "hidden sm:flex"} items-center gap-2 text-[11px] text-zinc-300 pt-1`}>
            <span className="animate-spin text-xs">💿</span>
            <span className="truncate">Som Original • {video.creator?.display_name || 'Velvet Records'}</span>
          </div>
        </div>

        {/* Bottom Playback Progress Bar */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 z-30">
          <div
            className="h-full bg-rose-500 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
