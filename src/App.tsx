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
import { LandingPage } from './components/landing/LandingPage';
import { UploadModal } from './components/creator/UploadModal';
import { WalletModal } from './components/wallet/WalletModal';
import { SupabaseConfigModal } from './components/supabase/SupabaseConfigModal';
import { AuthModal } from './components/auth/AuthModal';
import { LgpdTermsModal } from './components/legal/LgpdTermsModal';

const VelvetVipApp: React.FC = () => {
  const { hasConsented18Plus } = useAuth();
  const [activeView, setActiveView] = useState<string>('feed');
  const [currentTab, setCurrentTab] = useState<FeedTab>('foryou');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | undefined>(undefined);

  // Global modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [lgpdModalOpen, setLgpdModalOpen] = useState(false);

  const handleSelectCreator = (creatorId: string) => {
    setSelectedCreatorId(creatorId);
    setActiveView('profile');
  };

  const handleSelectVideo = (videoId: string) => {
    setActiveView('feed');
    // We can also switch to feed to view it
  };

  const handleOpenProfile = () => {
    setSelectedCreatorId(undefined); // views logged in profile
    setActiveView('profile');
  };

  return (
    <div id="velvet-vip-root" className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-rose-500 selection:text-white font-sans overflow-x-hidden">
      {/* 18+ Age Gate Legal Verification Modal */}
      <AgeVerificationModal />

      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setActiveView('feed');
        }}
        activeView={activeView}
        onViewChange={(view) => {
          if (view === 'profile') {
            handleOpenProfile();
          } else {
            setActiveView(view);
          }
        }}
        onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
        onOpenWalletModal={() => setWalletModalOpen(true)}
        onOpenLanding={() => setActiveView('landing')}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenLgpdModal={() => setLgpdModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="w-full">
        {activeView === 'feed' && (
          <VideoFeed
            currentTab={currentTab}
            onSelectCreator={handleSelectCreator}
            onOpenUpload={() => setUploadModalOpen(true)}
          />
        )}

        {activeView === 'explore' && (
          <ExplorePage
            onSelectVideo={handleSelectVideo}
            onSelectCreator={handleSelectCreator}
          />
        )}

        {activeView === 'activity' && (
          <NotificationsPage
            onSelectVideo={handleSelectVideo}
            onSelectCreator={handleSelectCreator}
          />
        )}

        {activeView === 'profile' && (
          <ProfileView
            creatorId={selectedCreatorId}
            onSelectVideo={handleSelectVideo}
            onOpenCreatorStudio={() => setActiveView('creator_studio')}
            onOpenMyPurchases={() => setActiveView('purchases')}
            onOpenWallet={() => setWalletModalOpen(true)}
            onOpenUpload={() => setUploadModalOpen(true)}
            onOpenLgpd={() => setLgpdModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeView === 'creator_studio' && (
          <CreatorDashboard
            onOpenUpload={() => setUploadModalOpen(true)}
            onSelectVideo={handleSelectVideo}
          />
        )}

        {activeView === 'purchases' && (
          <MyPurchasesPage
            onSelectVideo={handleSelectVideo}
            onBack={() => setActiveView('profile')}
          />
        )}

        {activeView === 'admin' && (
          <AdminPanel onSelectVideo={handleSelectVideo} />
        )}

        {activeView === 'landing' && (
          <LandingPage
            onEnterApp={() => setActiveView('feed')}
            onOpenUpload={() => setUploadModalOpen(true)}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation (hidden on landing presentation view) */}
      {activeView !== 'landing' && (
        <BottomNav
          activeView={activeView}
          onViewChange={(view) => {
            if (view === 'profile') {
              handleOpenProfile();
            } else {
              setActiveView(view);
            }
          }}
          onOpenUploadModal={() => setUploadModalOpen(true)}
        />
      )}

      {/* Global Interactive Modals */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          setActiveView('feed');
          setCurrentTab('foryou');
        }}
      />

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      <SupabaseConfigModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onOpenTerms={() => {
          setAuthModalOpen(false);
          setLgpdModalOpen(true);
        }}
      />

      <LgpdTermsModal
        isOpen={lgpdModalOpen}
        onClose={() => setLgpdModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <VelvetVipApp />
    </AuthProvider>
  );
}
