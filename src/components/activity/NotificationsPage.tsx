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
import { loadNotifications as fetchNotifications, markNotificationsRead } from '../../services/accountData';
import { useAuth } from '../../hooks/useAuth';

interface NotificationsPageProps {
  onSelectVideo?: (videoId: string) => void;
  onSelectCreator?: (creatorId: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onSelectVideo,
  onSelectCreator,
}) => {
  const { isAuthenticated, currentUser } = useAuth();
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);


  const loadNotifications = async () => {
    if (!isAuthenticated) { setNotifications([]); return; }
    try { setNotifications(await fetchNotifications()); setError(''); }
    catch { setError('Não foi possível carregar suas notificações.'); }
  };

  useEffect(() => {
    let active = true;
    setNotifications([]);
    const refresh = () => {
      if (!isAuthenticated) return;
      fetchNotifications().then(rows => { if (active) { setNotifications(rows); setError(''); } })
        .catch(() => { if (active) setError('Não foi possível carregar suas notificações.'); });
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [isAuthenticated, currentUser.id]);

  const handleMarkAllRead = async () => {
    if (!isAuthenticated) return;
    try { await markNotificationsRead(); await loadNotifications(); }
    catch { setError('Não foi possível marcar as notificações como lidas.'); }
  };

  const filtered = notifications;

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
      case 'new_content':
      case 'new_creator':
        return <Bell className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-16 pb-20 max-w-2xl mx-auto px-4 sm:px-6">
      {error && <p role="alert" className="mb-3 text-rose-400">{error}</p>}
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800 mb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-display">Atividade & Notificações</h1>
          <p className="text-xs text-zinc-400">{isAuthenticated ? 'Todas as novidades e atividades da sua conta aparecem aqui em uma única lista.' : 'Descubra conteúdos novos e criadores que você poderá seguir ao criar sua conta.'}</p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="shrink-0 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Marcar todas como lidas</span><span className="sm:hidden">Ler todas</span>
        </button>
      </div>

      {/* Unified notification stream: no choice between content/creators. */}
      {/* Notifications List */}
      {!isAuthenticated && <p className="mb-4 text-sm text-zinc-400">Faça login para acompanhar as interações da sua conta.</p>}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
            <p className="text-sm font-semibold text-zinc-400">Nenhuma notificação por enquanto</p>
            <p className="text-xs mt-1">{isAuthenticated ? 'Curtidas, comentários, assinaturas e compras aparecerão aqui.' : 'Novos conteúdos e criadores aparecerão aqui.'}</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (n.target_video_id && onSelectVideo) onSelectVideo(n.target_video_id);
                else if (n.target_id && n.type === 'new_creator' && onSelectCreator) onSelectCreator(n.target_id);
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
