import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Filter, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { AdCampaign, FeedTab, Video } from '../../types';
import { dbService } from '../../services/db';
import { VideoCard } from './VideoCard';
import { CommentsModal } from './CommentsModal';
import { ShareModal } from './ShareModal';
import { ReportModal } from './ReportModal';
import { LiveFeedCard, FeedLive } from './LiveFeedCard';
import { SubscribeModal } from '../creator/SubscribeModal';
import { AdBanner } from '../ads/AdBanner';
import { useAuth } from '../../hooks/useAuth';
import { supabase, isSupabaseConfigured, isDemoMode } from '../../lib/supabase';
import { resolvePrivateMediaRefs } from '../../services/media';

interface VideoFeedProps {
  selectedVideoId?: string;
  currentTab: FeedTab;
  onSelectCreator: (creatorId: string) => void;
  onTagClick?: (tag: string) => void;
  onOpenUpload: () => void;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  selectedVideoId,
  currentTab,
  onSelectCreator,
  onTagClick,
  onOpenUpload,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [liveItems, setLiveItems] = useState<FeedLive[]>([]);
  const [adCampaigns,setAdCampaigns]=useState<AdCampaign[]>([]);
  const [adsEnabled,setAdsEnabled]=useState(false);
  const [feedError,setFeedError]=useState('');
  const [feedLoading,setFeedLoading]=useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // Modals state
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<Video | null>(null);
  const [selectedVideoForShare, setSelectedVideoForShare] = useState<Video | null>(null);
  const [selectedVideoForReport, setSelectedVideoForReport] = useState<Video | null>(null);
  const [selectedVideoForSubscribe, setSelectedVideoForSubscribe] = useState<Video | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load videos based on tab
  const refreshFeed = async () => {
    setFeedLoading(true);setFeedError('');
    try{
      if (isDemoMode) {
        setVideos(dbService.getVideos(currentTab));setLiveItems([]);setAdCampaigns([]);setAdsEnabled(false);return;
      }
      if (!supabase) throw new Error('Conexão com o Supabase indisponível.');
      let query = supabase.from('videos').select('*, creator:creators(*)').eq('is_draft', false).eq('is_removed', false).eq('moderation_status', 'approved').eq('media_status', 'ready').eq('processing_status', 'ready');
      if (selectedVideoId) query = query.eq('id',selectedVideoId);
      if (currentTab === 'premium') query = query.eq('is_premium', true);
      query = query.order('created_at', { ascending: false });
      const liveQuery = supabase.from('live_sessions')
        .select('id,creator_id,title,required_plan,viewer_count,tips_enabled,creator:creators(display_name,avatar_url,level,level_score,feed_boost)')
        .eq('status','live').eq('moderation_status','approved').order('viewer_count',{ascending:false}).limit(20);
      const [videoRows,liveRows,campaignRows,settingsRow,planRows,userResult]=await Promise.all([
        query.limit(100),liveQuery,
        supabase.from('ad_campaigns').select('id,name,advertiser_name,creative_url,target_url,placement,status,audience,start_at,end_at,starts_at,ends_at').eq('status','active').eq('placement','feed').limit(20),
        supabase.from('app_content_settings').select('ads_enabled').eq('id','global').maybeSingle(),
        supabase.from('platform_plans').select('slug,ads_enabled').eq('is_active',true),
        supabase.auth.getUser(),
      ]);
      if(videoRows.error)throw videoRows.error;
      if(liveRows.error)throw liveRows.error;
      let list = (videoRows.data || []) as unknown as Video[];
      const user=userResult.data.user;
      let purchasedIds=new Set<string>();
      const purchasedCreatorIds=new Set<string>();
      const followedCreatorIds=new Set<string>();
      const subscriptionRank=new Map<string,number>();
      if(user){
        const [purchases,subscriptions,follows]=await Promise.all([
          supabase.from('purchases').select('video_id,creator_id').eq('user_id',user.id).eq('status','completed'),
          supabase.from('subscriptions').select('creator_id,plan_tier,current_period_end').eq('user_id',user.id).eq('status','active'),
          supabase.from('follows').select('creator_id').eq('follower_id',user.id),
        ]);
        purchasedIds=new Set((purchases.data||[]).map((x:any)=>x.video_id));
        for(const row of purchases.data||[])if((row as any).creator_id)purchasedCreatorIds.add((row as any).creator_id);
        for(const row of follows.data||[])followedCreatorIds.add((row as any).creator_id);
        const rank:Record<string,number>={free:0,basic:1,vip:2,exclusive:3};
        for(const row of subscriptions.data||[]){
          if(row.current_period_end && new Date(row.current_period_end)<=new Date()) continue;
          const value=rank[(row as any).plan_tier]||0;
          subscriptionRank.set((row as any).creator_id,Math.max(subscriptionRank.get((row as any).creator_id)||0,value));
        }
        if(currentTab==='following')list=list.filter((v:any)=>followedCreatorIds.has(v.creator_id));
      }else if(currentTab==='following')list=[];

      let lives=(liveRows.data||[]).map((x:any)=>({id:x.id,creator_id:x.creator_id,title:x.title,required_plan:x.required_plan,viewer_count:x.viewer_count,tips_enabled:x.tips_enabled,creator_name:x.creator?.display_name,creator_avatar:x.creator?.avatar_url}));
      if(currentTab==='following')lives=lives.filter((live:any)=>followedCreatorIds.has(live.creator_id));
      setLiveItems(lives);

      const now=Date.now();
      const planSlug=currentUser.platform_plan_slug||'gratis';
      const planAds=(planRows.data||[]).find((plan:any)=>plan.slug===planSlug)?.ads_enabled ?? planSlug==='gratis';
      setAdsEnabled(settingsRow.data?.ads_enabled!==false&&Boolean(planAds));
      const eligibleCampaigns=((campaignRows.error?[]:campaignRows.data)||[]).filter((campaign:any)=>{
        const start=campaign.start_at||campaign.starts_at;
        const end=campaign.end_at||campaign.ends_at;
        const scheduled=(!start||new Date(start).getTime()<=now)&&(!end||new Date(end).getTime()>now);
        const audience=campaign.audience||'all';
        const audienceMatch=audience==='all'||(audience==='free'&&planSlug==='gratis')||(audience==='subscribers'&&planSlug!=='gratis')||(audience==='creators'&&currentUser.role==='creator');
        return scheduled&&audienceMatch;
      }) as AdCampaign[];

      const refs:string[]=[];
      list.forEach((v:any)=>{if(v.thumbnail_url)refs.push(v.thumbnail_url);if(v.creator?.avatar_url)refs.push(v.creator.avatar_url);if(v.creator?.cover_url)refs.push(v.creator.cover_url);});
      eligibleCampaigns.forEach(c=>{if(c.creative_url)refs.push(c.creative_url);});
      const resolved=await resolvePrivateMediaRefs(refs);
      setAdCampaigns(eligibleCampaigns.map(c=>({...c,creative_url:c.creative_url?(resolved.get(c.creative_url)||c.creative_url):''})));
      const rank:Record<string,number>={free:0,basic:1,vip:2,exclusive:3};
      list=list.map((v:any)=>{
        const required=rank[v.required_tier||'vip']||0;
        const unlocked=(!v.is_premium&&v.access_type==='free')||purchasedIds.has(v.id)||(v.access_type==='subscription'&&required>0&&(subscriptionRank.get(v.creator_id)||0)>=required);
        return {...v,has_unlocked:unlocked,thumbnail_url:resolved.get(v.thumbnail_url)||v.thumbnail_url,creator:v.creator?{...v.creator,avatar_url:resolved.get(v.creator.avatar_url)||v.creator.avatar_url,cover_url:resolved.get(v.creator.cover_url)||v.creator.cover_url}:v.creator};
      });

      const ageHours=(v:any)=>Math.max(1,(now-new Date(v.created_at).getTime())/3600000);
      const trendingScore=(v:any)=>(Number(v.views_count||0)*.05+Number(v.likes_count||0)*3+Number(v.comments_count||0)*5+Number(v.favorites_count||0)*4+1)/Math.pow(ageHours(v)+2,.62);
      const personalizedScore=(v:any)=>trendingScore(v)*100+Number(v.creator?.feed_boost||1)*25+Number(v.creator?.level_score||0)*.2+(followedCreatorIds.has(v.creator_id)?500:0)+(subscriptionRank.has(v.creator_id)?350:0)+(purchasedCreatorIds.has(v.creator_id)?150:0);
      if(currentTab==='trending')list.sort((a:any,b:any)=>trendingScore(b)-trendingScore(a));
      else if(currentTab==='new'||currentTab==='following')list.sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
      else if(currentTab==='premium')list.sort((a:any,b:any)=>trendingScore(b)-trendingScore(a));
      else list.sort((a:any,b:any)=>Number(a.is_premium)-Number(b.is_premium)||personalizedScore(b)-personalizedScore(a));
      setVideos(list);
    }catch(error:any){console.error('feed_load_failed',error);setVideos([]);setLiveItems([]);setAdCampaigns([]);setFeedError(error?.message||'Não foi possível carregar o feed.');}
    finally{setFeedLoading(false);}
  };

  useEffect(() => {
    void refreshFeed();
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [currentTab, currentUser.id, selectedVideoId]);

  useEffect(() => {
    if(!isDemoMode) return;
    const unsub = dbService.subscribe(() => { void refreshFeed(); });
    return unsub;
  }, [currentTab, currentUser.id, selectedVideoId]);

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
  }, [activeIndex, liveItems.length, videos.length]);

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
  }, [activeIndex, liveItems.length, videos.length, selectedVideoForComments, selectedVideoForShare, selectedVideoForReport, selectedVideoForSubscribe]);

  const scrollToIndex = (index: number) => {
    if (index < 0 || index >= (liveItems.length + videos.length)) return;
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
          disabled={activeIndex >= liveItems.length + videos.length - 1}
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
        {feedLoading ? (
          <div className="flex h-full w-full items-center justify-center"><div className="text-center text-zinc-400"><Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-500"/><p className="mt-3 text-sm">Carregando feed…</p></div></div>
        ) : feedError ? (
          <div className="mx-auto flex h-full w-full max-w-sm flex-col items-center justify-center p-6 text-center text-zinc-400">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-950/30 text-amber-400"><AlertTriangle className="h-8 w-8"/></div>
            <h3 className="text-lg font-bold text-white">Não foi possível carregar o feed</h3>
            <p role="alert" className="mt-2 text-xs leading-relaxed text-zinc-500">{feedError}</p>
            <button type="button" onClick={()=>void refreshFeed()} className="mt-5 flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white"><RefreshCw className="h-4 w-4"/>Tentar novamente</button>
          </div>
        ) : videos.length === 0 && liveItems.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4">
              <Filter className="w-8 h-8" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1 font-display">Nenhum conteúdo nesta aba</h3>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
              {currentTab === 'following'
                ? 'Você ainda não está seguindo nenhum criador com vídeos publicados. Explore novos perfis!'
                : currentTab === 'premium'
                ? 'Nenhum vídeo VIP exclusivo no momento.'
                : 'Ainda não há vídeos ou lives aprovados nesta categoria.'}
            </p>
            <button
              onClick={onOpenUpload}
              className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/40 cursor-pointer hover:brightness-110"
            >
              Publicar Novo Vídeo
            </button>
          </div>
        ) : (
          <>
            {liveItems.map((live) => (
              <div key={`live-${live.id}`} className="flex w-full min-h-full snap-start items-center justify-center p-3">
                <LiveFeedCard live={live} isAuthenticated={isAuthenticated} onOpen={() => window.dispatchEvent(new CustomEvent('velvet:open-live', { detail: live.id }))} />
              </div>
            ))}
          {videos.map((video, idx) => {
            const feedIndex = liveItems.length + idx;
            const isNear = Math.abs(feedIndex - activeIndex) <= 1;
            const campaign=adCampaigns.length?adCampaigns[Math.floor(idx/4)%adCampaigns.length]:undefined;
            const showAds = adsEnabled && campaign && idx > 0 && idx % 4 === 0;
            return (
    <div key={video.id} className="w-full min-h-full snap-start">
      {showAds && campaign && <AdBanner campaign={campaign} compact />}
      <div className="w-full h-full flex items-center justify-center">
                {isNear ? (
                  <VideoCard
                    video={video}
                    isActive={feedIndex === activeIndex}
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
    </div>
            );
          })}
          </>
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
  );
};
