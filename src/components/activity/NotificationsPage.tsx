import React, { useState, useEffect } from 'react';
import {
  Bell,
  Heart,
  MessageSquare,
  UserPlus,
  DollarSign,
  Crown,
  CheckCircle2,
  CheckCheck
} from 'lucide-react';
import { Notification } from '../../types';
import { dbService } from '../../services/db';

interface NotificationsPageProps {
  onSelectVideo?: (videoId: string) => void;
  onSelectCreator?: (creatorId: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onSelectVideo,
  onSelectCreator,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'interactions' | 'monetization'>('all');

  const loadNotifications = () => {
    setNotifications(dbService.getNotifications());
  };

  useEffect(() => {
    loadNotifications();
    const refresh = () => loadNotifications();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const handleMarkAllRead = () => {
    dbService.markAllNotificationsAsRead();
    loadNotifications();
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'interactions') {
      return n.type === 'like' || n.type === 'comment' || n.type === 'follow';
    }
    if (filter === 'monetization') {
      return n.type === 'subscription' || n.type === 'purchase' || n.type === 'payout';
    }
    return true;
  });

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'subscription':
        return <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />;
      case 'purchase':
        return <DollarSign className="w-4 h-4 text-amber-300" />;
      case 'payout':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-16 pb-20 max-w-2xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800 mb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-display">Atividade & Notificações</h1>
          <p className="text-xs text-zinc-400">Acompanhe quem interagiu com seus vídeos e novas compras.</p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="shrink-0 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Marcar todas como lidas</span><span className="sm:hidden">Ler todas</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-rose-600 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Todas ({notifications.length})
        </button>

        <button
          onClick={() => setFilter('interactions')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            filter === 'interactions'
              ? 'bg-rose-600 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Interações
        </button>

        <button
          onClick={() => setFilter('monetization')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            filter === 'monetization'
              ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Monetização
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
            <p className="text-sm font-semibold text-zinc-400">Nenhuma notificação por enquanto</p>
            <p className="text-xs mt-1">Curtidas, comentários, assinaturas e compras aparecerão aqui.</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (n.target_video_id && onSelectVideo) onSelectVideo(n.target_video_id);
              }}
              className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                n.read
                  ? 'bg-[#121216]/60 border-zinc-800/80 hover:border-zinc-700'
                  : 'bg-[#16161f] border-rose-950/80 hover:border-rose-800/80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <img
                    src={n.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop'}
                    alt={n.sender_name}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#121216] border border-zinc-700 flex items-center justify-center">
                    {getIcon(n.type)}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] sm:text-xs text-zinc-200 leading-snug">
                    <strong className="text-white font-semibold">{n.sender_name}</strong> {n.message}
                  </p>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} •{' '}
                    {new Date(n.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
