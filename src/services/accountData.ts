import { supabase, isDemoMode } from '../lib/supabase';
import { dbService } from './db';
import { resolvePrivateMediaRefs } from './media';
import type { Creator, Notification, Subscription, SystemCategory, Video, ReportReason } from '../types';

function client() {
  if (!supabase) throw new Error('Conexão indisponível. Tente novamente.');
  return supabase;
}

async function account() {
  const api = client();
  const { data, error } = await api.auth.getUser();
  if (error || !data.user) throw new Error('Faça login para acessar sua conta.');
  return { api, id: data.user.id };
}

export async function listCategories(): Promise<SystemCategory[]> {
  if (isDemoMode) return dbService.getCategories();
  const { data, error } = await client().from('system_categories').select('*').eq('is_active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function loadExplore(): Promise<{ creators: Creator[]; videos: Video[] }> {
  if (isDemoMode) return { creators: dbService.getCreators(), videos: dbService.getVideos('foryou') };
  const api = client();
  const [creators, videos] = await Promise.all([
    api.from('creators').select('*').eq('is_approved', true).order('total_followers', { ascending: false }).limit(50),
    api.from('videos').select('*, creator:creators(*)').eq('is_draft', false).eq('is_removed', false)
      .eq('moderation_status', 'approved').eq('media_status', 'ready').eq('processing_status', 'ready')
      .order('is_premium').order('created_at', { ascending: false }).limit(100),
  ]);
  if (creators.error || videos.error) throw creators.error || videos.error;
  const refs = await resolvePrivateMediaRefs([
    ...(creators.data || []).map(c => c.avatar_url),
    ...(videos.data || []).flatMap(v => [v.thumbnail_url, v.creator?.avatar_url]),
  ]);
  return {
    creators: (creators.data || []).map(c => ({ ...c, avatar_url: refs.get(c.avatar_url) || '' })),
    videos: (videos.data || []).map(v => ({ ...v, thumbnail_url: refs.get(v.thumbnail_url) || '',
      creator: v.creator ? { ...v.creator, avatar_url: refs.get(v.creator.avatar_url) || '' } : undefined })),
  };
}

export async function loadPurchases(): Promise<{ videos: Video[]; subscriptions: Subscription[] }> {
  if (isDemoMode) return { videos: dbService.getPurchasedVideos(), subscriptions: dbService.getSubscriptions() };
  const { api, id } = await account();
  const [purchases, subscriptions] = await Promise.all([
    api.from('purchases').select('video:videos(*, creator:creators(*))').eq('user_id', id)
      .eq('status', 'completed').order('created_at', { ascending: false }),
    api.from('subscriptions').select('*, creator:creators(display_name,avatar_url)').eq('user_id', id)
      .order('created_at', { ascending: false }),
  ]);
  if (purchases.error || subscriptions.error) throw purchases.error || subscriptions.error;
  const videos = (purchases.data || []).map((row: any) => row.video).filter(Boolean);
  const refs = await resolvePrivateMediaRefs([...videos.map(v => v.thumbnail_url),
    ...(subscriptions.data || []).map((s: any) => s.creator?.avatar_url)]);
  return {
    videos: videos.map(v => ({ ...v, thumbnail_url: refs.get(v.thumbnail_url) || '' })),
    subscriptions: (subscriptions.data || []).map((s: any) => ({ ...s, price: Number(s.amount),
      status: s.status === 'active' && new Date(s.current_period_end) <= new Date() ? 'expired' : s.status,
      next_billing_date: s.current_period_end, creator_name: s.creator?.display_name || 'Criador',
      creator_avatar: refs.get(s.creator?.avatar_url) || '' })),
  };
}

export async function loadNotifications(): Promise<Notification[]> {
  if (isDemoMode) return dbService.getNotifications();
  const { api, id } = await account();
  const { data, error } = await api.from('notifications').select('*').eq('user_id', id)
    .order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []).map(n => ({ ...n,
    target_video_id: ['like', 'comment', 'purchase', 'premium_unlocked'].includes(n.type) ? n.target_id : undefined,
  }));
}

export async function markNotificationsRead() {
  if (isDemoMode) { dbService.markAllNotificationsAsRead(); return; }
  const { api, id } = await account();
  const { error } = await api.from('notifications').update({ read: true }).eq('user_id', id).eq('read', false);
  if (error) throw error;
  window.dispatchEvent(new Event('velvet-notifications-updated'));
}

export async function submitVideoReport(video: Video, reason: ReportReason, description: string) {
  if (isDemoMode) {
    dbService.submitReport({ target_type: 'video', target_id: video.id, target_title: video.title, reason, description });
    return;
  }
  const { api, id } = await account();
  const mapping: Record<string, string> = {
    unauthorized_content: 'copyright', privacy_violation: 'privacy', fake_identity: 'scam',
    inappropriate_content: 'other',
  };
  const { error } = await api.from('safety_reports').insert({ reporter_id: id, target_type: 'video',
    target_id: video.id, reason: mapping[reason] || reason, description: description.slice(0, 4000) });
  if (error) throw error;
}

// Export only the signed-in person's records; never join other profiles or identity documents.
export async function exportAccountData() {
  if (isDemoMode) return dbService.exportUserDataLGPD(dbService.getCurrentUser().id);
  const { api, id } = await account();
  const tables = [['profiles', 'id'], ['creators', 'user_id'], ['subscriptions', 'user_id'],
    ['purchases', 'user_id'], ['notifications', 'user_id'], ['safety_reports', 'reporter_id'],
    ['comments', 'user_id'], ['favorites', 'user_id'], ['follows', 'follower_id']] as const;
  const entries = await Promise.all(tables.map(async ([table, column]) => {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await api.from(table).select('*').eq(column, id).order('id').range(offset, offset + 499);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 500) break;
    }
    return [table, rows];
  }));
  return { exported_at: new Date().toISOString(), account_id: id,
    scope: 'Dados da conta disponíveis no aplicativo. Outros registros podem ser solicitados ao suporte.',
    records: Object.fromEntries(entries) };
}
