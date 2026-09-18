import React, { useState } from 'react';
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
import { AdminPanel } from './components/admin/AdminPanel';
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

const VelvetVipApp: React.FC = () => {
  const { hasConsented18Plus } = useAuth();
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

  const handleSelectCreator = (creatorId: string) => { setSelectedCreatorId(creatorId); setActiveView('profile'); };
  const handleSelectVideo = (_videoId: string) => { setActiveView('feed'); };
  const handleOpenProfile = () => { setSelectedCreatorId(undefined); setActiveView('profile'); };

  return <div id="velvet-vip-root" className="min-h-screen overflow-x-hidden bg-[#09090b] font-sans text-zinc-100 selection:bg-rose-500 selection:text-white">
    <AgeVerificationModal />
    <Header currentTab={currentTab} onTabChange={(tab) => { setCurrentTab(tab); setActiveView('feed'); }} activeView={activeView} onViewChange={(view) => view === 'profile' ? handleOpenProfile() : setActiveView(view)} onOpenSupabaseModal={() => setSupabaseModalOpen(true)} onOpenWalletModal={() => setWalletModalOpen(true)} onOpenLanding={() => setActiveView('landing')} onOpenAuthModal={() => setAuthModalOpen(true)} onOpenLgpdModal={() => setLgpdModalOpen(true)} />
    <main className="w-full">
      {activeView === 'feed' && <VideoFeed currentTab={currentTab} onSelectCreator={handleSelectCreator} onOpenUpload={() => setUploadModalOpen(true)} />}
      {activeView === 'explore' && <ExplorePage onSelectVideo={handleSelectVideo} onSelectCreator={handleSelectCreator} />}
      {activeView === 'activity' && <NotificationsPage onSelectVideo={handleSelectVideo} onSelectCreator={handleSelectCreator} />}
      {activeView === 'profile' && <ProfileView creatorId={selectedCreatorId} onSelectVideo={handleSelectVideo} onOpenCreatorStudio={() => setActiveView('creator_studio')} onOpenMyPurchases={() => setActiveView('purchases')} onOpenWallet={() => setWalletModalOpen(true)} onOpenUpload={() => setUploadModalOpen(true)} onOpenLgpd={() => setLgpdModalOpen(true)} onOpenAuth={() => setAuthModalOpen(true)} />}
      {activeView === 'creator_studio' && <CreatorDashboard onOpenUpload={() => setCreateHubOpen(true)} onSelectVideo={handleSelectVideo} />}
      {activeView === 'purchases' && <MyPurchasesPage onSelectVideo={handleSelectVideo} onBack={() => setActiveView('profile')} />}
      {activeView === 'admin' && <AdminCommandCenter onSelectVideo={handleSelectVideo} />}
      {activeView === 'live' && <LivePage onBack={() => setActiveView('feed')} />}
      {activeView === 'live_studio' && <LiveStudio onBack={() => setActiveView('creator_studio')} onOpenLives={() => setActiveView('live')} />}
      {activeView === 'community' && <CommunityPage onBack={() => setActiveView('feed')} />}
      {activeView === 'monetization' && <MonetizationPage onBack={() => setActiveView('feed')} />}
      {activeView === 'landing' && <LandingPage onEnterApp={() => setActiveView('feed')} onOpenUpload={() => setUploadModalOpen(true)} />}
    </main>
    {activeView !== 'landing' && <BottomNav activeView={activeView} onViewChange={(view) => view === 'profile' ? handleOpenProfile() : setActiveView(view)} onOpenUploadModal={() => setCreateHubOpen(true)} />}
    <CreateHub isOpen={createHubOpen} onClose={() => setCreateHubOpen(false)} onShortVideo={() => { setUploadMode('short'); setUploadModalOpen(true); }} onLongVideo={() => { setUploadMode('long'); setUploadModalOpen(true); }} onLive={() => setActiveView('live_studio')} />
    <UploadModal mode={uploadMode} isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onSuccess={() => { setActiveView('feed'); setCurrentTab('foryou'); }} />
    <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    <SupabaseConfigModal isOpen={supabaseModalOpen} onClose={() => setSupabaseModalOpen(false)} />
    <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onOpenTerms={() => { setAuthModalOpen(false); setLgpdModalOpen(true); }} />
    <LgpdTermsModal isOpen={lgpdModalOpen} onClose={() => setLgpdModalOpen(false)} />
  </div>;
};

export default function App() { return <AuthProvider><VelvetVipApp /></AuthProvider>; }
