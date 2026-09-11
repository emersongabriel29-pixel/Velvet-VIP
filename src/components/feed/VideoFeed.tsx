import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Sparkles, Filter } from 'lucide-react';
import { FeedTab, Video } from '../../types';
import { dbService } from '../../services/db';
import { VideoCard } from './VideoCard';
import { CommentsModal } from './CommentsModal';
import { ShareModal } from './ShareModal';
import { ReportModal } from './ReportModal';
import { SubscribeModal } from '../creator/SubscribeModal';
import { AdBanner } from '../ads/AdBanner';

interface VideoFeedProps {
  currentTab: FeedTab;
  onSelectCreator: (creatorId: string) => void;
  onTagClick?: (tag: string) => void;
  onOpenUpload: () => void;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  currentTab,
  onSelectCreator,
  onTagClick,
  onOpenUpload,
}) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // Modals state
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<Video | null>(null);
  const [selectedVideoForShare, setSelectedVideoForShare] = useState<Video | null>(null);
  const [selectedVideoForReport, setSelectedVideoForReport] = useState<Video | null>(null);
  const [selectedVideoForSubscribe, setSelectedVideoForSubscribe] = useState<Video | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load videos based on tab
  const refreshFeed = () => {
    const list = dbService.getVideos(currentTab);
    setVideos(list);
  };

  useEffect(() => {
    refreshFeed();
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [currentTab]);

  useEffect(() => {
    const unsub = dbService.subscribe(() => {
      refreshFeed();
    });
    return unsub;
  }, [currentTab]);

  // Handle scroll detection with IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const children = Array.from(container.children) as HTMLElement[];
      const containerTop = container.scrollTop;
      const itemHeight = container.clientHeight || window.innerHeight;

      const newIndex = Math.round(containerTop / itemHeight);
      if (newIndex >= 0 && newIndex < children.length && newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, videos.length]);

  // Keyboard navigation: Arrow Up / Down to switch videos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedVideoForComments || selectedVideoForShare || selectedVideoForReport || selectedVideoForSubscribe) {
        return; // Don't steal keys when modal is open
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      } else if (e.key === 'm') {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, videos.length, selectedVideoForComments, selectedVideoForShare, selectedVideoForReport, selectedVideoForSubscribe]);

  const scrollToIndex = (index: number) => {
    if (index < 0 || index >= videos.length) return;
    const container = containerRef.current;
    if (!container) return;

    const itemHeight = container.clientHeight || window.innerHeight;
    container.scrollTo({
      top: index * itemHeight,
      behavior: 'smooth',
    });
    setActiveIndex(index);
  };

  return (
    <div className="relative w-full h-[100dvh] pt-14 pb-14 sm:pb-0 flex items-center justify-center bg-[#09090b]">
      {/* Desktop Quick Nav Arrows */}
      <div className="hidden lg:flex flex-col gap-2 absolute right-8 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={() => scrollToIndex(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="w-11 h-11 rounded-full bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
          title="Vídeo Anterior (Seta Cima)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          onClick={() => scrollToIndex(activeIndex + 1)}
          disabled={activeIndex >= videos.length - 1}
          className="w-11 h-11 rounded-full bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
          title="Próximo Vídeo (Seta Baixo)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Main Snap Scroll Container */}
      <div
        id="vertical-video-feed-container"
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {videos.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4">
              <Filter className="w-8 h-8" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1 font-display">Nenhum vídeo nesta aba</h3>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
              {currentTab === 'following'
                ? 'Você ainda não está seguindo nenhum criador com vídeos publicados. Explore novos perfis!'
                : currentTab === 'premium'
                ? 'Nenhum vídeo VIP exclusivo no momento.'
                : 'Seja o primeiro a publicar um vídeo vertical nesta categoria!'}
            </p>
            <button
              onClick={onOpenUpload}
              className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/40 cursor-pointer hover:brightness-110"
            >
              Publicar Novo Vídeo
            </button>
          </div>
        ) : (
          videos.map((video, idx) => {
            // Only mount full rendering for active video, preload adjacent 1 video
            const isNear = Math.abs(idx - activeIndex) <= 1;
            const showAds = true;

  return (
    <>{showAds && <AdBanner compact />}              <div key={video.id} className="w-full h-full flex items-center justify-center snap-start">
                {isNear ? (
                  <VideoCard
                    video={video}
                    isActive={idx === activeIndex}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    onOpenComments={(v) => setSelectedVideoForComments(v)}
                    onOpenShare={(v) => setSelectedVideoForShare(v)}
                    onOpenReport={(v) => setSelectedVideoForReport(v)}
                    onOpenSubscribe={(v) => setSelectedVideoForSubscribe(v)}
                    onSelectCreator={onSelectCreator}
                    onTagClick={onTagClick}
                  />
                ) : (
                  <div className="w-full h-[88vh] sm:max-w-[420px] bg-zinc-950 rounded-3xl border border-zinc-900" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {selectedVideoForComments && (
        <CommentsModal
          videoId={selectedVideoForComments.id}
          videoTitle={selectedVideoForComments.title}
          isOpen={Boolean(selectedVideoForComments)}
          onClose={() => setSelectedVideoForComments(null)}
        />
      )}

      {selectedVideoForShare && (
        <ShareModal
          video={selectedVideoForShare}
          isOpen={Boolean(selectedVideoForShare)}
          onClose={() => setSelectedVideoForShare(null)}
        />
      )}

      {selectedVideoForReport && (
        <ReportModal
          video={selectedVideoForReport}
          isOpen={Boolean(selectedVideoForReport)}
          onClose={() => setSelectedVideoForReport(null)}
        />
      )}

      {selectedVideoForSubscribe && selectedVideoForSubscribe.creator && (
        <SubscribeModal
          creator={selectedVideoForSubscribe.creator}
          video={selectedVideoForSubscribe}
          mode="ppv"
          isOpen={Boolean(selectedVideoForSubscribe)}
          onClose={() => setSelectedVideoForSubscribe(null)}
          onSuccess={() => {
            refreshFeed();
          }}
        />
      )}
    </div>

    </>
  );
};
