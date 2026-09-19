import React, { useState, useEffect } from 'react';
import { ShoppingBag, Play, Crown, CheckCircle2, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { dbService } from '../../services/db';
import { isDemoMode } from '../../lib/supabase';
import { loadPurchases } from '../../services/accountData';
import { useAuth } from '../../hooks/useAuth';
import { Video, Subscription } from '../../types';

interface MyPurchasesPageProps {
  onSelectVideo: (videoId: string) => void;
  onBack: () => void;
}

export const MyPurchasesPage: React.FC<MyPurchasesPageProps> = ({
  onSelectVideo,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'subscriptions'>('videos');
  const [purchasedVideos, setPurchasedVideos] = useState<Video[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const { currentUser, isAuthenticated } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const loadData = async () => {
    try { const data = await loadPurchases(); setPurchasedVideos(data.videos); setSubscriptions(data.subscriptions); setError(''); }
    catch { setError('Não foi possível carregar suas compras. Tente novamente.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    setPurchasedVideos([]); setSubscriptions([]); setLoading(true);
    if (!isAuthenticated) { setLoading(false); return; }
    loadPurchases().then(data => { if (active) { setPurchasedVideos(data.videos); setSubscriptions(data.subscriptions); setError(''); } })
      .catch(() => { if (active) setError('Não foi possível carregar suas compras. Tente novamente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser.id, isAuthenticated]);

  const handleCancelSubscription = (subId: string) => {
    if (!isDemoMode) return;
    if (confirm('Deseja realmente cancelar esta assinatura? Você perderá o acesso VIP ao final do período atual.')) {
      dbService.cancelSubscription(subId);
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-16 pb-20 max-w-4xl mx-auto px-4 sm:px-6">
      {loading && <p role="status">Carregando compras…</p>}
      {error && <p role="alert" className="mb-4 text-rose-400">{error} <button onClick={loadData}>Tentar novamente</button></p>}
      {!isAuthenticated && <p>Faça login para acessar suas compras.</p>}
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-800 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2 font-display">
            <ShoppingBag className="w-6 h-6 text-rose-500" />
            <span>Minhas Compras & Biblioteca VIP</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Acesse todos os seus vídeos avulsos desbloqueados e gerencie suas assinaturas ativas.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'videos'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Vídeos Desbloqueados ({purchasedVideos.length})
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Assinaturas Ativas ({subscriptions.filter(s => s.status === 'active').length})
        </button>
      </div>

      {/* Tab: Videos Desbloqueados */}
      {activeTab === 'videos' && (
        <div>
          {purchasedVideos.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 bg-[#121216] rounded-3xl border border-zinc-800/60 p-8">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
              <h3 className="text-sm font-bold text-zinc-300">Nenhum vídeo comprado ainda</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Quando você compra vídeos individuais exclusivos em Pay-Per-View, eles aparecem aqui enquanto o acesso estiver válido.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {purchasedVideos.map((v) => (
                <div
                  key={v.id}
                  onClick={() => onSelectVideo(v.id)}
                  className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-rose-500 transition-all cursor-pointer shadow-lg"
                >
                  <img
                    src={v.thumbnail_url}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />

                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-zinc-950 text-[10px] font-black uppercase flex items-center gap-1 shadow">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Desbloqueado</span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <h4 className="text-xs font-bold text-white truncate drop-shadow">{v.title}</h4>
                    <p className="text-[10px] text-zinc-300 truncate mt-0.5">{v.creator?.display_name}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                      <Play className="w-3.5 h-3.5 fill-rose-400" />
                      <span>Assistir Agora</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Assinaturas */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 bg-[#121216] rounded-3xl border border-zinc-800/60 p-8">
              <Crown className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
              <h3 className="text-sm font-bold text-zinc-300">Nenhuma assinatura ativa</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Assine seus criadores favoritos para ter acesso a todos os lançamentos e conteúdos de bastidores.
              </p>
            </div>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-5 rounded-3xl bg-[#141419] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={sub.creator_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop'}
                      alt={sub.creator_name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-rose-500"
                      referrerPolicy="no-referrer"
                    />
                    <Crown className="w-4 h-4 text-amber-400 fill-amber-400 absolute -top-1.5 -right-1.5" />
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2 font-display">
                      {sub.creator_name}
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {sub.plan_tier === 'vip' ? 'Plano VIP Gold' : sub.plan_tier === 'exclusive' ? 'Plano Exclusivo' : 'Plano Básico'}
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      R$ {Number(sub.price || sub.amount || 0).toFixed(2).replace('.', ',')} • Pagamento pelo período contratado
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Acesso até: {new Date(sub.next_billing_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {sub.status === 'active' && isDemoMode ? (
                    <button
                      onClick={() => handleCancelSubscription(sub.id)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-rose-950/50 hover:text-rose-400 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancelar Assinatura
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{sub.status === 'active' ? 'Sem renovação automática' : sub.status === 'expired' ? 'Expirada' : 'Cancelada'}</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
