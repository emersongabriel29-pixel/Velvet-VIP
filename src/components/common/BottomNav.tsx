import React, { useEffect, useState } from 'react';
import { Home, Compass, Plus, Bell, User as UserIcon, ShieldAlert, Grid2X2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { loadNotifications } from '../../services/accountData';
import { useLocale } from '../../hooks/useLocale';

interface BottomNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onOpenUploadModal: () => void;
  onOpenAuthModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onViewChange,
  onOpenUploadModal,
  onOpenAuthModal,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const {t}=useLocale();
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    let active = true; setUnreadCount(0);
    const refresh = () => { if (isAuthenticated) loadNotifications().then(rows => { if (active) setUnreadCount(rows.filter(n => !n.read).length); }).catch(() => { if (active) setUnreadCount(0); }); };
    refresh(); const timer = window.setInterval(refresh, 30000);
    window.addEventListener('velvet-notifications-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('velvet-notifications-updated', refresh); window.removeEventListener('focus', refresh); };
  }, [isAuthenticated, currentUser.id]);

  return (
    <nav
      id="mobile-bottom-navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-[#09090b]/95 backdrop-blur-xl border-t border-zinc-800/80 px-2 py-1.5 transition-all max-w-lg mx-auto sm:max-w-none"
    >
      <div className="flex items-center justify-around h-13">
        {/* Início (Feed) */}
        <button
          id="nav-btn-feed"
          onClick={() => onViewChange('feed')}
          className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors cursor-pointer ${
            activeView === 'feed' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Home className={`w-5 h-5 ${activeView === 'feed' ? 'stroke-[2.5px] text-rose-500' : ''}`} />
          <span className={`text-[10px] ${activeView === 'feed' ? 'font-bold text-white' : 'font-medium'}`}>
            {t('home')}
          </span>
        </button>

        {/* Explorar */}
        <button
          id="nav-btn-explore"
          onClick={() => onViewChange('explore')}
          className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors cursor-pointer ${
            activeView === 'explore' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Compass className={`w-5 h-5 ${activeView === 'explore' ? 'stroke-[2.5px] text-rose-500' : ''}`} />
          <span className={`text-[10px] ${activeView === 'explore' ? 'font-bold text-white' : 'font-medium'}`}>
            {t('explore')}
          </span>
        </button>

        {/* Criar / Publicar (+ Button with distinctive VIP gradient) */}
        <div className="flex-1 flex items-center justify-center">
          <button
            id="nav-btn-create"
            onClick={() => currentUser.role === 'creator' || currentUser.role === 'admin' ? onOpenUploadModal() : onOpenAuthModal()}
            title="Publicar Vídeo Vertical"
            className="w-11 h-9 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/60 active:scale-95 transition-all cursor-pointer hover:brightness-110"
          >
            <Plus className="w-5 h-5 stroke-[2.8px]" />
          </button>
        </div>

        {/* Atividade (Notificações) */}
        <button
          id="nav-btn-activity"
          onClick={() => onViewChange('activity')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors cursor-pointer ${
            activeView === 'activity' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <Bell className={`w-5 h-5 ${activeView === 'activity' ? 'stroke-[2.5px] text-rose-500' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#09090b]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] ${activeView === 'activity' ? 'font-bold text-white' : 'font-medium'}`}>
            {t('activity')}
          </span>
        </button>

        {/* Perfil */}
        <button
          id="nav-btn-profile"
          onClick={() => onViewChange('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors cursor-pointer ${
            activeView === 'profile' || activeView === 'creator_studio' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <UserIcon className={`w-5 h-5 ${activeView === 'profile' || activeView === 'creator_studio' ? 'stroke-[2.5px] text-rose-500' : ''}`} />
            {currentUser.role === 'creator' && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#09090b]" />
            )}
          </div>
          <span className={`text-[10px] ${activeView === 'profile' || activeView === 'creator_studio' ? 'font-bold text-white' : 'font-medium'}`}>
            {isAuthenticated ? t('profile') : t('login')}
          </span>
        </button>

        {/* Admin Tab (If role === 'admin') */}
        {currentUser.role === 'admin' && (
          <button
            id="nav-btn-admin"
            onClick={() => onViewChange('admin')}
            className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors cursor-pointer ${
              activeView === 'admin' ? 'text-white' : 'text-rose-400/80 hover:text-rose-300'
            }`}
          >
            <ShieldAlert className={`w-5 h-5 ${activeView === 'admin' ? 'stroke-[2.5px] text-rose-500' : ''}`} />
            <span className={`text-[10px] ${activeView === 'admin' ? 'font-bold text-rose-400' : 'font-medium text-rose-400/80'}`}>
              Admin
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
