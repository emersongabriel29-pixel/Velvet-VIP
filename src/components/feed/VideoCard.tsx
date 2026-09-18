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
  Maximize2
} from 'lucide-react';
import { Video } from '../../types';
import { dbService } from '../../services/db';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [hasLiked, setHasLiked] = useState(Boolean(video.has_liked));
  const [hasFavorited, setHasFavorited] = useState(Boolean(video.has_favorited));
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [expandDesc, setExpandDesc] = useState(false);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    if (video.creator_id) {
      setIsFollowing(dbService.isFollowing(video.creator_id));
    }
  }, [video.creator_id]);

  useEffect(() => {
    setLikesCount(video.likes_count);
    setHasLiked(Boolean(video.has_liked));
    setHasFavorited(Boolean(video.has_favorited));
  }, [video.likes_count, video.has_liked, video.has_favorited]);

  // Handle Play/Pause when card becomes active/inactive
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive && video.has_unlocked) {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log('Autoplay prevented or pending', err);
            setIsPlaying(false);
          });
      }
      dbService.recordView(video.id);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [isActive, video.has_unlocked, video.id]);

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
      setProgress((current / duration) * 100);
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
      if (videoRef.current && video.has_unlocked) {
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

  const handleLike = () => {
    const res = dbService.toggleLike(video.id);
    setHasLiked(res.hasLiked);
    setLikesCount(res.count);
  };

  const handleFavorite = () => {
    const fav = dbService.toggleFavorite(video.id);
    setHasFavorited(fav);
  };

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!video.creator_id) return;
    const nowFollowing = dbService.toggleFollow(video.creator_id);
    setIsFollowing(nowFollowing);
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

  const isLocked = video.is_premium && !video.has_unlocked;

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
        <video
          ref={videoRef}
          src={video.video_url}
          poster={video.thumbnail_url}
          loop
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          className={`w-full h-full object-cover transition-filter duration-300 ${
            isLocked ? 'filter blur-2xl brightness-50 scale-105' : ''
          }`}
        />

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
