import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  Heart,
  Plus,
  Trash2,
  Lock,
  Globe,
  ArrowUpRight,
  Sparkles,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star
} from 'lucide-react';
import { Creator, Video, Withdrawal } from '../../types';
import { dbService } from '../../services/db';
import { useAuth } from '../../hooks/useAuth';
import { CreatorAnalyticsPanel } from './CreatorAnalyticsPanel';
import { CreatorPlansManager } from './CreatorPlansManager';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { uploadProfileImage } from '../../services/media';

interface CreatorDashboardProps {
  onOpenUpload: () => void;
  onSelectVideo: (videoId: string) => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  onOpenUpload,
  onSelectVideo,
}) => {
  const { currentCreator } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'highlights' | 'plans' | 'payouts'>('overview');
  const [highlights,setHighlights]=useState<any[]>([]);
  const [highlightTitle,setHighlightTitle]=useState('');
  const [highlightFile,setHighlightFile]=useState<File|null>(null);
  const [highlightMessage,setHighlightMessage]=useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // Payout request form state
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [pixKey, setPixKey] = useState('123.456.789-00');
  const [withdrawAmount, setWithdrawAmount] = useState('500');
  const [payoutMessage, setPayoutMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Subscription plan prices state
  const [basicPrice, setBasicPrice] = useState(29.90);
  const [vipPrice, setVipPrice] = useState(59.90);
  const [plansSaved, setPlansSaved] = useState(false);

  const creator: Creator = currentCreator || {
    id: 'cr-default',
    user_id: 'usr-default',
    handle: 'criador_vip',
    display_name: 'Criador Velvet VIP',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&fit=crop',
    bio: 'Criador exclusivo Velvet VIP.',
    verified: true,
    subscription_price_basic: 29.90,
    subscription_price_vip: 59.90,
    total_followers: 12450,
    total_likes: 84200,
    total_views: 450000,
    wallet_balance: 3840.50,
    total_earnings: 12540.00,
    created_at: new Date().toISOString(),
  };

  const creatorLevel = Math.max(1, Math.floor((creator.total_earnings || 0) / 1000) + 1);
  const nextLevelTarget = creatorLevel * 1000;

  const loadData = () => {
    if (creator.id) {
      setVideos(dbService.getVideosByCreator(creator.id));
      setWithdrawals(dbService.getWithdrawals());
    }
  };

  const loadHighlights = async () => { if(!isSupabaseConfigured || !supabase || !creator.id) return; const {data}=await supabase.from('creator_highlights').select('*').eq('creator_id',creator.id).order('sort_order').order('created_at',{ascending:false}); setHighlights(data||[]); };
  const createHighlight = async () => { if(!highlightTitle.trim() || !highlightFile || !supabase){setHighlightMessage('Informe um título e escolha uma imagem.');return;} try{const media_url=await uploadProfileImage(highlightFile,'cover');const {error}=await supabase.from('creator_highlights').insert({creator_id:creator.id,title:highlightTitle.trim(),cover_url:media_url,media_url,media_type:'image',sort_order:highlights.length});if(error)throw error;setHighlightTitle('');setHighlightFile(null);setHighlightMessage('Destaque publicado.');await loadHighlights();}catch(e:any){setHighlightMessage(e.message||'Erro ao publicar destaque.');}};
  const deleteHighlight = async (id:string) => { if(!supabase||!confirm('Excluir este destaque?'))return;await supabase.from('creator_highlights').delete().eq('id',id);await loadHighlights(); };

  useEffect(() => {
    loadData();
    loadHighlights();
    setBasicPrice(creator.subscription_price_basic || 29.90);
    setVipPrice(creator.subscription_price_vip || 59.90);
  }, [currentCreator]);

  const handleDeleteVideo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza de que deseja excluir este vídeo permanentemente?')) {
      dbService.deleteVideo(id);
      loadData();
    }
  };

  const handleRequestPayout = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayoutMessage({ type: 'error', text: 'Informe um valor válido para saque.' });
      return;
    }
    const balance = creator.available_balance ?? creator.wallet_balance ?? 0;
    if (amt > balance) {
      setPayoutMessage({ type: 'error', text: 'Saldo insuficiente para este valor de saque.' });
      return;
    }

    try {
      dbService.requestWithdrawal(creator.id, amt, pixKey, pixKeyType);
      setPayoutMessage({ type: 'success', text: 'Solicitação de saque PIX registrada! Processamento em até 24h úteis.' });
      loadData();
      setTimeout(() => setPayoutMessage(null), 4000);
    } catch (err: any) {
      setPayoutMessage({ type: 'error', text: err.message || 'Erro ao processar saque.' });
    }
  };

  const handleSavePlans = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.updateCreatorPlans(creator.id, basicPrice, vipPrice);
    setPlansSaved(true);
    setTimeout(() => setPlansSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-16 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Progression and earnings */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4"><p className="text-xs text-zinc-500">Nível do criador</p><p className="mt-1 text-2xl font-black text-amber-300">Nível {creatorLevel}</p><p className="mt-1 text-xs text-zinc-400">Próximo marco: R$ {nextLevelTarget.toFixed(2).replace('.', ',')}</p></div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="text-xs text-zinc-500">Ganhos confirmados</p><p className="mt-1 text-2xl font-black">R$ {(creator.total_earnings || 0).toFixed(2).replace('.', ',')}</p><p className="mt-1 text-xs text-zinc-400">Somente pagamentos aprovados</p></div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4"><p className="text-xs text-zinc-500">Saldo disponível</p><p className="mt-1 text-2xl font-black text-emerald-300">R$ {(creator.available_balance || 0).toFixed(2).replace('.', ',')}</p><p className="mt-1 text-xs text-zinc-400">Elegível para saque conforme regras</p></div>
      </div>

      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 fill-amber-400" />
            VELVET CREATOR STUDIO
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            Painel do Criador • {creator.display_name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Gerencie seus vídeos verticais, planos de assinatura VIP, faturamento e solicitações de saque.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/40 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Publicar Novo Vídeo</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-6">
        {/* Available Balance */}
        <div className="p-4 rounded-2xl bg-[#141419] border border-emerald-500/30 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-400">Saldo Disponível</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-display">
            R$ {(creator.available_balance ?? creator.wallet_balance ?? 0).toFixed(2).replace('.', ',')}
          </div>
          <button
            onClick={() => setActiveTab('payouts')}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold mt-1 flex items-center gap-1 cursor-pointer"
          >
            <span>Solicitar Saque PIX</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Total Earnings */}
        <div className="p-4 rounded-2xl bg-[#141419] border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-400">Receita Bruta Total</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-display">
            R$ {(creator.gross_earnings ?? creator.total_earnings ?? 0).toFixed(2).replace('.', ',')}
          </div>
          <span className="text-[10px] text-zinc-500">Repasse líquido (85% criador)</span>
        </div>

        {/* Total Followers */}
        <div className="p-4 rounded-2xl bg-[#141419] border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-400">Seguidores Ativos</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-display">
            {creator.total_followers.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-zinc-500">+12% nesta semana</span>
        </div>

        {/* Total Views */}
        <div className="p-4 rounded-2xl bg-[#141419] border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-400">Visualizações</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-display">
            {creator.total_views.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-zinc-500">{(creator.total_likes).toLocaleString('pt-BR')} curtidas</span>
        </div>
      </div>

      <CreatorAnalyticsPanel creatorId={creator.id} fallback={{ followers: creator.total_followers, views: creator.total_views, likes: creator.total_likes, comments: 0, earnings: creator.total_earnings || 0 }} />
      <CreatorPlansManager creatorId={creator.id} />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Visão Geral & Faturamento
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'videos'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Gerenciar Vídeos ({videos.length})
        </button>

        <button onClick={() => setActiveTab('highlights')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'highlights' ? 'bg-rose-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}><Star className="inline mr-1 h-3.5 w-3.5"/>Destaques ({highlights.length})</button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'plans'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Planos de Assinatura
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'payouts'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Saques & Carteira PIX
        </button>
      </div>

      {/* Tab 1: Overview & Performance */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Revenue distribution breakdown */}
          <div className="p-6 rounded-3xl bg-[#141419] border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white font-display">Divisão de Faturamento Recente</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-xs text-zinc-400 block">Assinaturas Recorrentes</span>
                <span className="text-lg font-bold text-rose-400 mt-1 block">R$ 8.450,00</span>
                <span className="text-[11px] text-zinc-500">68% do faturamento</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-xs text-zinc-400 block">Vendas Avulsas (PPV)</span>
                <span className="text-lg font-bold text-amber-400 mt-1 block">R$ 4.090,00</span>
                <span className="text-[11px] text-zinc-500">32% do faturamento</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-xs text-zinc-400 block">Taxa da Plataforma</span>
                <span className="text-lg font-bold text-zinc-300 mt-1 block">15,0%</span>
                <span className="text-[11px] text-emerald-400">Você recebe 85% líquido</span>
              </div>
            </div>

            {/* Performance bars */}
            <div className="space-y-3 pt-4 border-t border-zinc-800/80">
              <span className="text-xs font-semibold text-zinc-300">Engajamento Semanal por Categoria:</span>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Vídeos Verticais VIP</span>
                    <span className="text-white font-bold">92% retenção</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: '92%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Vídeos Gratuitos (Descoberta)</span>
                    <span className="text-white font-bold">78% conversão em seguidores</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '78%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Manage Videos */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-display">Seus Vídeos Publicados</h3>
            <button
              onClick={onOpenUpload}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Vídeo</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {videos.map((v) => (
              <div
                key={v.id}
                onClick={() => onSelectVideo(v.id)}
                className="p-3.5 rounded-2xl bg-[#141419] border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={v.thumbnail_url}
                    alt={v.title}
                    className="w-14 h-20 object-cover rounded-xl border border-zinc-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate">{v.title}</h4>
                      {v.is_premium ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          R$ {(v.premium_price || 19.90).toFixed(2).replace('.', ',')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                          <Globe className="w-2.5 h-2.5" />
                          Gratuito
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{v.description}</p>
                    <div className="flex items-center gap-4 text-[11px] text-zinc-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {v.views_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-500" /> {v.likes_count}
                      </span>
                      <span>{new Date(v.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleDeleteVideo(v.id, e)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Excluir vídeo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'highlights' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-800 bg-[#141419] p-5">
            <h3 className="font-bold">Lives e destaques do perfil</h3>
            <p className="mt-1 text-xs text-zinc-400">Publique destaques que qualquer visitante poderá ver antes de assinar.</p>
            {highlightMessage && <p className="mt-3 text-xs text-amber-300">{highlightMessage}</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><input value={highlightTitle} onChange={e=>setHighlightTitle(e.target.value)} maxLength={40} placeholder="Título do destaque" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/><label className="cursor-pointer rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold">Escolher imagem<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>setHighlightFile(e.target.files?.[0]||null)}/></label><button onClick={createHighlight} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold">Publicar</button></div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">{highlights.map(h=><div key={h.id} className="w-28 shrink-0 text-center"><div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-rose-500 bg-zinc-900">{h.cover_url && <img src={h.cover_url} className="h-full w-full object-cover" alt={h.title}/>}</div><p className="mt-2 truncate text-xs font-bold">{h.title}</p><button onClick={()=>deleteHighlight(h.id)} className="mt-1 text-[10px] text-rose-400">Excluir</button></div>)}{highlights.length===0&&<p className="text-sm text-zinc-500">Nenhum destaque publicado.</p>}</div>
        </div>
      )}

      {/* Tab 3: Subscription Plans Config */}
      {activeTab === 'plans' && (
        <div className="max-w-xl space-y-6">
          <div className="p-6 rounded-3xl bg-[#141419] border border-zinc-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white font-display">Configurar Preços de Assinatura Mensal</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Defina o valor cobrado mensalmente dos seus membros VIP para acessar seus conteúdos exclusivos.
              </p>
            </div>

            {plansSaved && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Preços atualizados com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSavePlans} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Plano Básico (Mensal em R$):
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="9.90"
                  value={basicPrice}
                  onChange={(e) => setBasicPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Plano VIP Gold (Mensal em R$):
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="19.90"
                  value={vipPrice}
                  onChange={(e) => setVipPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                Salvar Novos Preços
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: Payouts & PIX */}
      {activeTab === 'payouts' && (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Request Payout Form */}
          <div className="p-6 rounded-3xl bg-[#141419] border border-zinc-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <span>Solicitar Saque via PIX</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Transfira seus ganhos diretamente para sua conta bancária sem burocracia.
              </p>
            </div>

            {payoutMessage && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  payoutMessage.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500 text-rose-300'
                }`}
              >
                {payoutMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{payoutMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleRequestPayout} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Tipo de Chave PIX:
                </label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="cpf">CPF / CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone Celular</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Sua Chave PIX:
                </label>
                <input
                  type="text"
                  required
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Valor do Saque (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="50"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Disponível para saque: <strong>R$ {(creator.available_balance ?? creator.wallet_balance ?? 0).toFixed(2).replace('.', ',')}</strong>
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                Confirmar Saque PIX
              </button>
            </form>
          </div>

          {/* Withdrawals History */}
          <div className="p-6 rounded-3xl bg-[#141419] border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white font-display">Histórico de Saques</h3>
            <div className="space-y-2.5">
              {withdrawals.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  Nenhuma solicitação de saque realizada ainda.
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">
                        R$ {w.amount.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        PIX: {w.pix_key} • {new Date(w.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        w.status === 'completed'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {w.status === 'completed' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>{w.status === 'completed' ? 'Aprovado' : 'Em Análise'}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
