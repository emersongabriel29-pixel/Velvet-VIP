import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { FeedTab } from './types';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { AgeVerificationModal } from './components/common/AgeVerificationModal';
import { VideoFeed } from './components/feed/VideoFeed';
import { ExplorePage } from './components/explore/ExplorePage';
import { NotificationsPage } from './components/activity/NotificationsPage';
import { ProfileView } from './components/profile/ProfileView';
import { CreatorDashboard } from './components/creator/CreatorDashboard';
import { MyPurchasesPage } from './components/purchases/MyPurchasesPage';
import { AdminCommandCenter } from './components/admin/AdminCommandCenter';
import { LandingPage } from './components/landing/LandingPage';
import { UploadModal } from './components/creator/UploadModal';
import { WalletModal } from './components/wallet/WalletModal';
import { SupabaseConfigModal } from './components/supabase/SupabaseConfigModal';
import { AuthModalV2 as AuthModal } from './components/auth/AuthModalV2';
import { LgpdTermsModal } from './components/legal/LgpdTermsModal';
import { MonetizationPage } from './components/monetization/MonetizationPage';
import { LivePage } from './components/live/LivePage';
import { CommunityPage } from './components/community/CommunityPage';
import { CreateHub } from './components/creator/CreateHub';
import { LiveStudio } from './components/live/LiveStudio';
import { ProductHub, ProductTool } from './components/product/ProductHub';
import { ProductToolPage } from './components/product/ProductToolPage';
import { LocaleProvider } from './hooks/useLocale';

const VelvetVipApp: React.FC = () => {
  const { hasConsented18Plus } = useAuth();
  const [selectedVideoId, setSelectedVideoId] = useState<string | undefined>();
  const [activeView, setActiveView] = useState<string>('feed');
  const [currentTab, setCurrentTab] = useState<FeedTab>('foryou');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | undefined>(undefined);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createHubOpen, setCreateHubOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'short' | 'long'>('short');
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [lgpdModalOpen, setLgpdModalOpen] = useState(false);
  const [productTool, setProductTool] = useState<ProductTool>('search');
  const [productToolBackView,setProductToolBackView]=useState('more');
  const [initialLiveId, setInitialLiveId] = useState<string | undefined>(undefined);

  useEffect(()=>{
    const syncHash=()=>{
      const match=window.location.hash.match(/^#creator=([0-9a-f-]{36})$/i);
      if(match){setSelectedCreatorId(match[1]);setActiveView('profile');}
      const liveMatch=window.location.hash.match(/^#live=([0-9a-f-]{36})$/i);
      if(liveMatch){setInitialLiveId(liveMatch[1]);setActiveView('live');}
    };
    syncHash();
    window.addEventListener('hashchange',syncHash);
    return()=>window.removeEventListener('hashchange',syncHash);
  },[]);

  useEffect(()=>{ const handler=(event:Event)=>{ const id=(event as CustomEvent<string>).detail; setInitialLiveId(id); setActiveView('live'); }; window.addEventListener('velvet:open-live',handler); return()=>window.removeEventListener('velvet:open-live',handler); },[]);
  const handleSelectCreator = (creatorId: string) => { setSelectedCreatorId(creatorId); window.history.replaceState(null,'',`#creator=${creatorId}`); setActiveView('profile'); };
  const handleSelectVideo = (videoId: string) => { setSelectedVideoId(videoId); setCurrentTab('foryou'); setActiveView('feed'); };
  const handleOpenProfile = () => { setSelectedCreatorId(undefined); if(window.location.hash.startsWith('#creator=')) window.history.replaceState(null,'',window.location.pathname+window.location.search); setActiveView('profile'); };
  const handleOpenLive = (liveId?: string) => { setInitialLiveId(liveId); if(liveId) window.history.replaceState(null,'',`#live=${liveId}`); setActiveView('live'); };
  const handleOpenProductTool=(tool:ProductTool,backView:string)=>{setProductTool(tool);setProductToolBackView(backView);setActiveView('product_tool');};
  const handleNavigate=(view:string)=>view==='profile'?handleOpenProfile():setActiveView(view);

  return <div id="velvet-vip-root" className="min-h-screen overflow-x-hidden bg-[#09090b] font-sans text-zinc-100 selection:bg-rose-500 selection:text-white">
    <AgeVerificationModal />
    <Header currentTab={currentTab} onTabChange={(tab) => { setCurrentTab(tab); setActiveView('feed'); }} activeView={activeView} onViewChange={(view) => view === 'profile' ? handleOpenProfile() : setActiveView(view)} onOpenSupabaseModal={() => setSupabaseModalOpen(true)} onOpenWalletModal={() => setWalletModalOpen(true)} onOpenLanding={() => setActiveView('landing')} onOpenAuthModal={() => setAuthModalOpen(true)} onOpenLgpdModal={() => setLgpdModalOpen(true)} />
    <main className="w-full">
      {activeView === 'feed' && <VideoFeed selectedVideoId={selectedVideoId} currentTab={currentTab} onSelectCreator={handleSelectCreator} onOpenUpload={() => setCreateHubOpen(true)} />}
      {activeView === 'explore' && <ExplorePage onSelectVideo={handleSelectVideo} onSelectCreator={handleSelectCreator} onOpenLive={handleOpenLive} onOpenTool={tool=>handleOpenProductTool(tool,'explore')} />}
      {activeView === 'activity' && <NotificationsPage onSelectVideo={handleSelectVideo} onSelectCreator={handleSelectCreator} onOpenMessages={()=>handleOpenProductTool('messages','activity')} />}
      {activeView === 'profile' && <ProfileView creatorId={selectedCreatorId} onSelectVideo={handleSelectVideo} onOpenCreatorStudio={() => setActiveView('creator_studio')} onOpenMyPurchases={() => setActiveView('purchases')} onOpenWallet={() => setWalletModalOpen(true)} onOpenUpload={() => setCreateHubOpen(true)} onOpenAuth={() => setAuthModalOpen(true)} onOpenLive={handleOpenLive} />}
      {activeView === 'creator_studio' && <CreatorDashboard onOpenUpload={() => setCreateHubOpen(true)} onSelectVideo={handleSelectVideo} onOpenTool={tool=>handleOpenProductTool(tool,'creator_studio')} />}
      {activeView === 'purchases' && <MyPurchasesPage onSelectVideo={handleSelectVideo} onBack={() => setActiveView('profile')} onOpenTool={tool=>handleOpenProductTool(tool,'purchases')} />}
      {activeView === 'admin' && <AdminCommandCenter onSelectVideo={handleSelectVideo} />}
      {activeView === 'live' && <LivePage initialLiveId={initialLiveId} onBack={() => { setInitialLiveId(undefined); if(window.location.hash.startsWith('#live='))window.history.replaceState(null,'',window.location.pathname+window.location.search); setActiveView('feed'); }} />}
      {activeView === 'live_studio' && <LiveStudio onBack={() => setActiveView('creator_studio')} onOpenLives={() => setActiveView('live')} />}
      {activeView === 'community' && <CommunityPage onBack={() => setActiveView('feed')} />}
      {activeView === 'more' && <ProductHub onOpen={tool=>handleOpenProductTool(tool,'more')} onNavigate={handleNavigate} onOpenLgpd={()=>setLgpdModalOpen(true)} onOpenAuth={()=>setAuthModalOpen(true)} />}
      {activeView === 'product_tool' && <ProductToolPage onSelectVideo={handleSelectVideo} onSelectCreator={handleSelectCreator} tool={productTool} onBack={() => setActiveView(productToolBackView)} />}
      {activeView === 'monetization' && <MonetizationPage onBack={() => setActiveView('feed')} />}
      {activeView === 'landing' && <LandingPage onEnterApp={() => setActiveView('feed')} onOpenUpload={() => setCreateHubOpen(true)} />}
    </main>
    {activeView !== 'landing' && <BottomNav activeView={activeView} onViewChange={(view) => view === 'profile' ? handleOpenProfile() : setActiveView(view)} onOpenUploadModal={() => setCreateHubOpen(true)} onOpenAuthModal={() => setAuthModalOpen(true)} />}
    <CreateHub isOpen={createHubOpen} onClose={() => setCreateHubOpen(false)} onShortVideo={() => { setUploadMode('short'); setUploadModalOpen(true); }} onLongVideo={() => { setUploadMode('long'); setUploadModalOpen(true); }} onLive={() => setActiveView('live_studio')} />
    <UploadModal mode={uploadMode} isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onSuccess={() => { setActiveView('feed'); setCurrentTab('foryou'); }} />
    <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    <SupabaseConfigModal isOpen={supabaseModalOpen} onClose={() => setSupabaseModalOpen(false)} />
    <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onOpenTerms={() => { setAuthModalOpen(false); setLgpdModalOpen(true); }} />
    <LgpdTermsModal isOpen={lgpdModalOpen} onClose={() => setLgpdModalOpen(false)} />
  </div>;
};

export default function App() { return <LocaleProvider><AuthProvider><VelvetVipApp /></AuthProvider></LocaleProvider>; }
