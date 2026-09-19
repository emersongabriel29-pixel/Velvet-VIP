import React, { useEffect, useState } from 'react';
import { Bell, Heart, MessageSquare, UserPlus, DollarSign, Crown, CheckCircle2, CheckCheck, Loader2 } from 'lucide-react';
import { Notification } from '../../types';
import { dbService } from '../../services/db';
import { isDemoMode, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { getProfileImageUrl } from '../../services/media';

interface NotificationsPageProps {
  onSelectVideo?: (videoId: string) => void;
  onSelectCreator?: (creatorId: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onSelectVideo, onSelectCreator }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'interactions' | 'monetization'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    if (!isAuthenticated) { setNotifications([]); return; }
    setLoading(true); setError('');
    try {
      if (isDemoMode) {
        setNotifications(dbService.getNotifications());
        return;
      }
      if (!supabase || !currentUser.id) throw new Error('Sessão indisponível.');
      const { data, error: queryError } = await supabase.from('notifications').select('*')
        .eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(100);
      if (queryError) throw queryError;
      const rows = data || [];
      const senderIds = [...new Set(rows.map((n: any) => n.sender_id).filter(Boolean))];
      const profiles = senderIds.length
        ? await supabase.from('public_profiles').select('id,name,username,avatar_url').in('id', senderIds)
        : { data: [], error: null } as any;
      if (profiles.error) throw profiles.error;
      const profileMap = new Map((profiles.data || []).map((p: any) => [p.id, p]));
      const mapped = await Promise.all(rows.map(async (n: any) => {
        const sender: any = n.sender_id ? profileMap.get(n.sender_id) : null;
        const senderAvatar = sender?.avatar_url ? await getProfileImageUrl(sender.avatar_url) : '';
        const isVideoTarget = ['like','comment','purchase','premium_unlocked'].includes(n.type);
        return {
          ...n,
          sender_name: sender?.name || sender?.username || n.title || 'Velvet VIP',
          sender_avatar: senderAvatar,
          target_video_id: isVideoTarget ? n.target_id : undefined,
        } as Notification;
      }));
      setNotifications(mapped);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar as notificações.');
      setNotifications([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void loadNotifications();
    if (!isAuthenticated || isDemoMode || !supabase || !currentUser.id) return;
    const channel = supabase.channel(`notifications:${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, () => { void loadNotifications(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isAuthenticated, currentUser.id]);

  const handleMarkAllRead = async () => {
    if (!isAuthenticated) return;
    if (isDemoMode) { dbService.markAllNotificationsAsRead(); await loadNotifications(); return; }
    if (!supabase || !currentUser.id) return;
    const { error: updateError } = await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id).eq('read', false);
    if (updateError) setError(updateError.message); else await loadNotifications();
  };

  const filtered = notifications.filter((n) => filter === 'interactions'
    ? ['like','comment','follow'].includes(n.type)
    : filter === 'monetization'
      ? ['subscription','purchase','payout','premium_unlocked'].includes(n.type)
      : true);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'subscription': return <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />;
      case 'purchase': return <DollarSign className="w-4 h-4 text-amber-300" />;
      case 'payout': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default: return <Bell className="w-4 h-4 text-rose-400" />;
    }
  };

  const openNotification = (n: Notification) => {
    if (n.target_video_id && onSelectVideo) { onSelectVideo(n.target_video_id); return; }
    if (n.target_id && ['follow','subscription'].includes(n.type) && onSelectCreator) onSelectCreator(n.target_id);
  };

  return <div className="min-h-screen bg-[#09090b] text-white pt-16 pb-20 max-w-2xl mx-auto px-4 sm:px-6">
    <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800 mb-3">
      <div><h1 className="text-xl sm:text-2xl font-black">Atividade & Notificações</h1><p className="text-xs text-zinc-400">{isAuthenticated ? 'Interações e movimentações reais da sua conta.' : 'Crie uma conta para receber notificações.'}</p></div>
      {isAuthenticated && <button onClick={handleMarkAllRead} className="shrink-0 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5"><CheckCheck className="w-3.5 h-3.5" /><span className="hidden sm:inline">Marcar todas como lidas</span><span className="sm:hidden">Ler todas</span></button>}
    </div>
    {error && <div role="alert" className="mb-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</div>}
    {isAuthenticated && <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
      {([['all','Todas'],['interactions','Interações'],['monetization','Monetização']] as const).map(([id,label]) => <button key={id} onClick={() => setFilter(id)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${filter===id?'bg-rose-600 text-white':'bg-zinc-900 text-zinc-400'}`}>{label}{id==='all'? ` (${notifications.length})`:''}</button>)}
    </div>}
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-rose-400" /></div> :
    <div className="space-y-2">
      {!isAuthenticated ? <div className="py-16 text-center text-zinc-500"><Bell className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-sm">Entre para acompanhar sua atividade.</p></div> :
      filtered.length===0 ? <div className="py-16 text-center text-zinc-500"><Bell className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-sm font-semibold">Nenhuma notificação por enquanto</p></div> :
      filtered.map(n => <button key={n.id} onClick={() => openNotification(n)} className={`w-full p-3 rounded-xl border text-left flex items-start justify-between gap-3 ${n.read?'bg-[#121216]/60 border-zinc-800':'bg-[#16161f] border-rose-950/80'}`}>
        <div className="flex items-start gap-3"><div className="relative"><div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">{n.sender_avatar && <img src={n.sender_avatar} alt="" className="w-full h-full object-cover" />}</div><div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#121216] border border-zinc-700 flex items-center justify-center">{getIcon(n.type)}</div></div>
        <div><p className="text-xs text-zinc-200"><strong className="text-white">{n.sender_name || n.title}</strong> {n.message}</p><span className="text-[10px] text-zinc-500 mt-1 block">{new Date(n.created_at).toLocaleString('pt-BR')}</span></div></div>
        {!n.read && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-2" />}
      </button>)}
    </div>}
  </div>;
};
