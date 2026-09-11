import React, { useEffect, useState } from 'react';
import { BarChart3, Users, Heart, MessageCircle, DollarSign, Radio, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const CreatorAnalyticsPanel: React.FC<{ creatorId: string; fallback: { followers: number; views: number; likes: number; comments: number; earnings: number } }> = ({ creatorId, fallback }) => {
  const [data, setData] = useState({ subscribers: 0, views: fallback.views, likes: fallback.likes, comments: fallback.comments, tips: 0, sales: 0, lives: 0 });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isSupabaseConfigured || !supabase || creatorId.startsWith('cr-')) { setLoading(false); return; }
      try {
        const [subs, tips, sales, videos, lives] = await Promise.all([
          supabase.from('creator_subscriptions').select('user_id', { count: 'exact', head: true }).eq('creator_id', creatorId).eq('status', 'active'),
          supabase.from('creator_tips').select('creator_amount').eq('creator_id', creatorId).eq('status', 'paid'),
          supabase.from('purchases').select('amount').eq('creator_id', creatorId).eq('status', 'completed'),
          supabase.from('videos').select('views_count,likes_count,comments_count').eq('creator_id', creatorId).eq('moderation_status', 'approved'),
          supabase.from('live_sessions').select('id', { count: 'exact', head: true }).eq('creator_id', creatorId),
        ]);
        const error = [subs, tips, sales, videos, lives].find(result => result.error)?.error;
        if (error) throw error;
        const totals = (videos.data || []).reduce((acc, video: any) => ({ views: acc.views + Number(video.views_count || 0), likes: acc.likes + Number(video.likes_count || 0), comments: acc.comments + Number(video.comments_count || 0) }), { views: 0, likes: 0, comments: 0 });
        if (mounted) setData({ subscribers: subs.count || 0, views: totals.views, likes: totals.likes, comments: totals.comments, tips: (tips.data || []).reduce((sum, row: any) => sum + Number(row.creator_amount || 0), 0), sales: (sales.data || []).reduce((sum, row: any) => sum + Number(row.amount || 0), 0), lives: lives.count || 0 });
      } catch (error: any) { if (mounted) setNotice('Relatório parcial: algumas métricas exigem políticas de leitura do Supabase.'); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [creatorId]);

  const engagement = data.views ? ((data.likes + data.comments) / data.views * 100).toFixed(2).replace('.', ',') : '0,00';
  const card = [
    ['Assinantes ativos', data.subscribers, Users, 'text-rose-300'],
    ['Engajamento', `${engagement}%`, Heart, 'text-pink-300'],
    ['Gorjetas pagas', `R$ ${data.tips.toFixed(2).replace('.', ',')}`, DollarSign, 'text-amber-300'],
    ['Vendas confirmadas', `R$ ${data.sales.toFixed(2).replace('.', ',')}`, BarChart3, 'text-emerald-300'],
    ['Comentários', data.comments, MessageCircle, 'text-sky-300'],
    ['Lives realizadas', data.lives, Radio, 'text-violet-300'],
  ];
  return <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5"><div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-bold"><BarChart3 className="h-5 w-5 text-rose-400" /> Relatório de desempenho</h2><p className="mt-1 text-xs text-zinc-500">Assinaturas e pagamentos entram somente quando confirmados.</p></div>{loading && <Loader2 className="h-4 w-4 animate-spin text-rose-400" />}</div>{notice && <p className="mt-3 text-xs text-amber-300">{notice}</p>}<div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">{card.map(([label, value, Icon, tone]: any) => <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><Icon className={`h-5 w-5 ${tone}`} /><p className="mt-3 text-xs text-zinc-500">{label}</p><p className={`mt-1 text-xl font-black ${tone}`}>{value}</p></div>)}</div></section>;
};
