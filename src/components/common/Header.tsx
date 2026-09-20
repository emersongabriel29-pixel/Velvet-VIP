import React, { useState } from 'react';
import {
  Sparkles,
  Database,
  ShieldCheck,
  UserCheck,
  Crown,
  ChevronDown,
  HelpCircle,
  LogIn,
  FileText,
  Scale,
  Grid2X2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FeedTab, UserRole } from '../../types';
import { useLocale } from '../../hooks/useLocale';

interface HeaderProps {
  currentTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  activeView: string;
  onViewChange: (view: string) => void;
  onOpenSupabaseModal: () => void;
  onOpenWalletModal: () => void;
  onOpenLanding: () => void;
  onOpenAuthModal?: () => void;
  onOpenLgpdModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  activeView,
  onViewChange,
  onOpenSupabaseModal,
  onOpenWalletModal,
  onOpenLanding,
  onOpenAuthModal,
  onOpenLgpdModal
}) => {
  const { currentUser, switchUserRole, isAuthenticated, canUseTestMode, isRolePreview } = useAuth();
  const {locale,setLocale,t}=useLocale();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const tabs: { id: FeedTab; label: string; vip?: boolean }[] = [
    { id: 'foryou', label: t('forYou') },
    { id: 'following', label: t('following') },
    { id: 'trending', label: t('trending') },
    { id: 'new', label: t('new') },
    { id: 'premium', label: 'VIP 💎', vip: true },
  ];

  return (
    <header id="main-header" className="fixed top-0 inset-x-0 z-40 bg-[#09090b]/85 backdrop-blur-xl border-b border-zinc-800/60 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
        {/* Logo & 18+ tag */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="header-logo-btn"
            onClick={() => onViewChange('feed')}
            className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-900/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1 font-display">
                VELVET <span className="text-rose-500">VIP</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 leading-none">
                  18+
                </span>
              </span>
            </div>
          </button>
        </div>

        {/* Feed tabs (when on feed view or desktop) */}
        {activeView === 'feed' && (
          <nav id="header-feed-tabs" className="hidden sm:flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {tabs.map((tab) => {
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`feed-tab-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? tab.vip
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-rose-900/40'
                        : 'bg-white text-zinc-950 font-bold shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Action Tools: Role switcher, Wallet, Supabase, Landing */}
        <div className="flex items-center gap-2">
          {/* Landing page info trigger */}
          <button
            id="header-landing-btn"
            onClick={onOpenLanding}
            title="Apresentação da Plataforma"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700/50 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden lg:inline">{t('presentation')}</span>
          </button>

          {/* Supabase Schema Modal Button */}
          <button
            id="header-supabase-btn"
            onClick={onOpenSupabaseModal}
            title="Banco de Dados Supabase (SQL & Conexão)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-medium transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase</span>
          </button>

          {/* LGPD & Legal compliance trigger */}
          {onOpenLgpdModal && (
            <button
              id="header-lgpd-btn"
              onClick={onOpenLgpdModal}
              title="Jurídico, LGPD e Termos de Uso 18+"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>LGPD & Termos</span>
            </button>
          )}

          {/* Auth / Login Modal trigger */}
          {!isAuthenticated && onOpenAuthModal && (
            <button
              id="header-auth-btn"
              onClick={onOpenAuthModal}
              title="Entrar ou Criar Conta"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">{t('login')}</span>
            </button>
          )}

          {/* Mais — moved from the bottom navigation/header balance position */}
          <button
            id="header-more-btn"
            onClick={() => onViewChange('more')}
            title="Mais"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <Grid2X2 className="w-3.5 h-3.5 text-zinc-300" />
            <span>{t('more')}</span>
          </button>

          <select aria-label="Idioma" value={locale} onChange={e=>setLocale(e.target.value as 'pt-BR'|'en-US')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-[10px] font-bold text-zinc-300"><option value="pt-BR">PT</option><option value="en-US">EN</option></select>

          {/* Role Switcher Dropdown (Allows testing as User, Creator, or Admin) */}
          {isAuthenticated && canUseTestMode && <div className="relative">
            <button
              id="header-role-switcher-btn"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              {currentUser.role === 'admin' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              ) : currentUser.role === 'creator' ? (
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="capitalize hidden md:inline">
                {isRolePreview ? 'Teste: ' : ''}{currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'creator' ? 'Criador' : 'Membro'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {roleDropdownOpen && (
              <div
                id="role-dropdown-menu"
                className="absolute right-0 mt-2 w-52 bg-[#141419] border border-zinc-700 rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-zinc-400 border-b border-zinc-800 mb-1">
                  Alternar Modo de Teste
                </div>
                {(['user', 'creator', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchUserRole(r);
                      setRoleDropdownOpen(false);
                      onViewChange(r === 'admin' ? 'admin' : r === 'creator' ? 'creator_studio' : 'profile');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                      currentUser.role === r
                        ? 'bg-rose-600/20 text-rose-300 font-semibold'
                        : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r === 'admin' ? (
                        <ShieldCheck className="w-4 h-4 text-rose-400" />
                      ) : r === 'creator' ? (
                        <Crown className="w-4 h-4 text-amber-400" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-sky-400" />
                      )}
                      <span>
                        {r === 'admin'
                          ? 'Administrador (/admin)'
                          : r === 'creator'
                          ? 'Criador de Conteúdo'
                          : 'Usuário Comum'}
                      </span>
                    </div>
                    {currentUser.role === r && <span className="text-[10px] text-rose-400">Ativo</span>}
                  </button>
                ))}

                <div className="pt-1 mt-1 border-t border-zinc-800">
                  {onOpenAuthModal && (
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        onOpenAuthModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800/80 hover:text-white cursor-pointer text-left"
                    >
                      <LogIn className="w-3.5 h-3.5 text-rose-400" />
                      <span>Tela de Login / Cadastro</span>
                    </button>
                  )}
                  {onOpenLgpdModal && (
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        onOpenLgpdModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800/80 hover:text-white cursor-pointer text-left"
                    >
                      <Scale className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Jurídico, LGPD & 18+</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>}
        </div>
      </div>

      {/* Mobile subheader tabs for Feed */}
      {activeView === 'feed' && (
        <div className="sm:hidden flex items-center justify-start gap-1 overflow-x-auto no-scrollbar px-3 py-1.5 bg-[#09090b]/95 border-t border-zinc-800/40">
          {tabs.map((tab) => {
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? tab.vip
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white'
                      : 'bg-white text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
