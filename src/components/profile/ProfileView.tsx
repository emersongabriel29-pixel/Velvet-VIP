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
  LogIn
} from 'lucide-react';
import { Creator, Video } from '../../types';
import { dbService } from '../../services/db';
import { useAuth } from '../../hooks/useAuth';
import { SubscribeModal } from '../creator/SubscribeModal';

interface ProfileViewProps {
  creatorId?: string; // If passed, views that creator. If undefined, views current logged-in user!
  onSelectVideo: (videoId: string) => void;
  onOpenCreatorStudio: () => void;
  onOpenMyPurchases: () => void;
  onOpenWallet: () => void;
  onOpenUpload: () => void;
  onOpenLgpd?: () => void;
  onOpenAuth?: () => void;
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
}) => {
  const { currentUser, currentCreator, updateProfile } = useAuth();
  const [creator, setCreator] = useState<Creator | undefined>(undefined);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'free' | 'vip' | 'long' | 'favorites'>('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [bioInput, setBioInput] = useState('');

  const isOwnProfile = !creatorId || (currentCreator && currentCreator.id === creatorId) || (creator && creator.user_id === currentUser.id);

  useEffect(() => {
    let targetCreator: Creator | undefined;
    if (creatorId) {
      targetCreator = dbService.getCreatorById(creatorId);
    } else if (currentCreator) {
      targetCreator = currentCreator;
    }

    setCreator(targetCreator);

    if (targetCreator) {
      const vList = dbService.getVideosByCreator(targetCreator.id);
      setVideos(vList);
      setIsFollowing(dbService.isFollowing(targetCreator.id));
    } else {
      // Regular user profile
      const favs = dbService.getFavorites();
      setVideos(favs);
    }

    setNameInput(currentUser.name);
    setBioInput(currentUser.bio || '');
  }, [creatorId, currentCreator, currentUser]);

  const handleToggleFollow = () => {
    if (!creator) return;
    const nowF = dbService.toggleFollow(creator.id);
    setIsFollowing(nowF);
    setCreator(dbService.getCreatorById(creator.id));
  };

  const handleSaveProfile = () => {
    updateProfile({ name: nameInput, bio: bioInput });
    setIsEditingBio(false);
  };

  // Filter videos according to tab
  const displayedVideos = videos.filter((v) => {
    if (activeTab === 'free') return !v.is_premium;
    if (activeTab === 'vip') return v.is_premium;
    if (activeTab === 'long') return v.content_kind === 'long' || v.duration_seconds >= 60;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-14 pb-20 max-w-4xl mx-auto px-3 sm:px-6">
      {/* Cover Banner */}
      <div className="relative h-44 sm:h-56 rounded-3xl overflow-hidden bg-gradient-to-r from-rose-950/60 via-zinc-900 to-amber-950/40 border border-zinc-800 shadow-xl mb-14">
        {creator?.cover_url && (
          <img
            src={creator.cover_url}
            alt="Cover"
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />

        {/* Action button on top right of cover */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {isOwnProfile ? (
            <button
              onClick={() => setIsEditingBio(!isEditingBio)}
              className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
        <div className="absolute -bottom-10 left-6 flex items-end gap-4">
          <div className="relative">
            <img
              src={creator?.avatar_url || currentUser.avatar_url}
              alt="Avatar"
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-[#09090b] shadow-2xl bg-zinc-800"
              referrerPolicy="no-referrer"
            />
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
            {isOwnProfile ? (
              <>
                {currentUser.role === 'creator' && (
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
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>R$ {currentUser.wallet_balance.toFixed(2).replace('.', ',')}</span>
                </button>

                <button
                  onClick={onOpenUpload}
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Postar Vídeo</span>
                </button>

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
        {isEditingBio ? (
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Nome</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#141419] border border-zinc-700 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Biografia</label>
              <textarea
                rows={2}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#141419] border border-zinc-700 rounded-lg text-xs text-white resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditingBio(false)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        ) : (
          <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
            {creator?.bio || currentUser.bio || 'Criador exclusivo na plataforma Velvet VIP.'}
          </p>
        )}

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
