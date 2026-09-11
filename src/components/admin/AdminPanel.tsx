import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Film,
  DollarSign,
  Flag,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Check,
  AlertTriangle,
  Crown,
  Search,
  Eye,
  FolderTree,
  Tag,
  Plus,
  ShieldCheck,
  Download,
  Lock,
  FileText,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { dbService } from '../../services/db';
import { Video, Report, Creator, Withdrawal, SystemCategory, SystemTag, SecurityAuditLog } from '../../types';

interface AdminPanelProps {
  onSelectVideo?: (videoId: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSelectVideo }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'security_lgpd' | 'reports' | 'payouts' | 'videos' | 'creators'>('overview');
  const [stats, setStats] = useState(dbService.getStats());
  const [reports, setReports] = useState<Report[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<SystemCategory[]>([]);
  const [tags, setTags] = useState<SystemTag[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityAuditLog[]>([]);

  // Category & Tag form states
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newTagName, setNewTagName] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [platformFee, setPlatformFee] = useState(15);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadData = () => {
    setStats(dbService.getStats());
    setReports(dbService.getReports());
    setWithdrawals(dbService.getWithdrawals());
    setVideos(dbService.getVideos('foryou'));
    setCreators(dbService.getCreators());
    setCategories(dbService.getCategories(true));
    setTags(dbService.getTags());
    setSecurityLogs(dbService.getSecurityLogs());
  };

  useEffect(() => {
    loadData();
    const unsub = dbService.subscribe(loadData);
    return unsub;
  }, []);

  const showFeedback = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 3000);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    dbService.addCategory(newCatName.trim(), newCatDesc.trim());
    setNewCatName('');
    setNewCatDesc('');
    showFeedback('Nova categoria cadastrada no sistema com sucesso!');
    loadData();
  };

  const handleToggleCategory = (cat: SystemCategory) => {
    dbService.updateCategory(cat.id, { is_active: !cat.is_active });
    showFeedback(`Categoria "${cat.name}" ${cat.is_active ? 'desativada' : 'ativada'}.`);
    loadData();
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (confirm(`Tem certeza que deseja excluir a categoria "${catName}"?`)) {
      dbService.deleteCategory(catId);
      showFeedback(`Categoria "${catName}" excluída.`);
      loadData();
    }
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    dbService.addTag(newTagName.trim());
    setNewTagName('');
    showFeedback('Tag cadastrada com sucesso!');
    loadData();
  };

  const handleDeleteTag = (tagId: string) => {
    dbService.deleteTag(tagId);
    showFeedback('Tag removida.');
    loadData();
  };

  const handleExportLgpd = () => {
    const data = dbService.exportUserDataLGPD(dbService.getCurrentUser().id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `velvet_vip_lgpd_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('Relatório e dados LGPD exportados com sucesso!');
  };

  const handleApproveWithdrawal = (withdrawalId: string) => {
    dbService.approveWithdrawal(withdrawalId);
    showFeedback('Saque aprovado e liquidado via PIX com sucesso!');
    loadData();
  };

  const handleResolveReport = (reportId: string, action: 'resolved' | 'dismissed') => {
    dbService.updateReportStatus(reportId, action);
    showFeedback(action === 'resolved' ? 'Denúncia resolvida e ação aplicada.' : 'Denúncia arquivada como improcedente.');
    loadData();
  };

  const handleDeleteVideo = (videoId: string) => {
    if (confirm('Ação administrativa: confirmar exclusão e remoção deste vídeo?')) {
      dbService.deleteVideo(videoId);
      showFeedback('Vídeo removido da plataforma.');
      loadData();
    }
  };

  const handleToggleVerifyCreator = (creatorId: string) => {
    dbService.toggleCreatorVerification(creatorId);
    showFeedback('Status de verificação do criador atualizado.');
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-16 pb-20 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Admin Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-950/40">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
              Painel Administrativo Velvet VIP
              <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Super Admin
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Controle central de moderação, aprovação de saques PIX, gestão de vídeos e criadores.
            </p>
          </div>
        </div>

        {/* Global fee config */}
        <div className="flex items-center gap-2 bg-[#141419] p-2 rounded-xl border border-zinc-800 text-xs">
          <span className="text-zinc-400">Taxa Velvet:</span>
          <span className="font-bold text-amber-400">{platformFee}%</span>
          <button
            onClick={() => {
              const newFee = prompt('Nova taxa da plataforma (%):', platformFee.toString());
              if (newFee) setPlatformFee(Number(newFee) || 15);
            }}
            className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
          >
            Alterar
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="my-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 my-6">
        <div className="p-4 rounded-2xl bg-[#141419] border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block">Usuários Cadastrados</span>
          <span className="text-xl font-black text-white font-display mt-1 block">
            {stats.total_users.toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] text-emerald-400">+148 hoje</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141419] border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block">Criadores Ativos</span>
          <span className="text-xl font-black text-white font-display mt-1 block">
            {stats.total_creators.toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] text-amber-400">100% 18+ auditados</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141419] border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block">Vídeos Publicados</span>
          <span className="text-xl font-black text-white font-display mt-1 block">
            {stats.total_videos.toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] text-zinc-500">Transcodificados 9:16</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141419] border border-emerald-500/30">
          <span className="text-[11px] text-emerald-400 block">Faturamento Bruto</span>
          <span className="text-xl font-black text-white font-display mt-1 block">
            R$ {stats.total_revenue.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-[10px] text-zinc-400">Lucro taxa: R$ {(stats.total_revenue * 0.15).toFixed(2).replace('.', ',')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141419] border border-rose-500/30">
          <span className="text-[11px] text-rose-400 block">Denúncias Pendentes</span>
          <span className="text-xl font-black text-white font-display mt-1 block">
            {reports.filter(r => r.status === 'pending').length}
          </span>
          <span className="text-[10px] text-zinc-400">Fila de moderação</span>
        </div>
      </div>

      {/* Admin Subtabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Visão Geral
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'reports'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          <Flag className="w-3.5 h-3.5 text-rose-400" />
          <span>Denúncias & Moderação ({reports.filter(r => r.status === 'pending').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'payouts'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>Aprovar Saques PIX ({withdrawals.filter(w => w.status === 'pending').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'videos'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Vídeos ({videos.length})
        </button>

        <button
          onClick={() => setActiveTab('creators')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'creators'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Criadores ({creators.length})
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'categories'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5 text-amber-400" />
          <span>Categorias & Tags ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security_lgpd')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'security_lgpd'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cibersegurança & LGPD</span>
        </button>
      </div>

      {/* TAB 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#141419] border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white font-display">Resumo de Segurança & Compliance 18+</h3>
            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Gate de idade obrigatório ativado em todas as rotas (18+ consent).</span>
              </li>
              <li className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Bloqueio e RLS configurados para conteúdo exclusivo VIP.</span>
              </li>
              <li className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Fila de denúncias automatizada com alertas de menoridade e violação de direitos.</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-[#141419] border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white font-display">Ações Rápidas de Administração</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('payouts')}
                className="p-3.5 rounded-2xl bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-left cursor-pointer transition-colors"
              >
                Liberar Saques PIX Pendentes →
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className="p-3.5 rounded-2xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-bold text-left cursor-pointer transition-colors"
              >
                Analisar Fila de Denúncias →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Reports & Moderation */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white font-display">Fila de Denúncias de Conteúdo</h3>
          {reports.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Nenhuma denúncia pendente no momento.
            </div>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-[#141419] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase">
                      {r.reason}
                    </span>
                    <span className="text-xs text-zinc-400">Alvo: <strong>{r.target_title || r.target_id}</strong></span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    "{r.description}"
                  </p>
                  <span className="text-[10px] text-zinc-500">
                    Enviado em {new Date(r.created_at).toLocaleString('pt-BR')} • Status: {r.status}
                  </span>
                </div>

                {r.status === 'pending' ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleResolveReport(r.id, 'dismissed')}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'resolved')}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Remover Conteúdo
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-500 font-semibold">
                    {r.status === 'resolved' ? 'Resolvido' : 'Descartado'}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Payouts */}
      {activeTab === 'payouts' && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white font-display">Solicitações de Saques PIX dos Criadores</h3>
          {withdrawals.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Nenhuma solicitação de saque no momento.
            </div>
          ) : (
            withdrawals.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-2xl bg-[#141419] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white font-display">
                      R$ {w.amount.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      PIX ({w.pix_key_type})
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Chave: <strong className="text-zinc-200">{w.pix_key}</strong>
                  </p>
                  <span className="text-[10px] text-zinc-500">
                    Solicitado em {new Date(w.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>

                {w.status === 'pending' ? (
                  <button
                    onClick={() => handleApproveWithdrawal(w.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprovar & Efetuar PIX</span>
                  </button>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Pago via PIX</span>
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: Videos */}
      {activeTab === 'videos' && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white font-display">Vídeos Cadastrados na Plataforma</h3>
          <div className="space-y-2.5">
            {videos.map((v) => (
              <div
                key={v.id}
                className="p-3.5 rounded-2xl bg-[#141419] border border-zinc-800 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={v.thumbnail_url}
                    alt={v.title}
                    className="w-12 h-16 object-cover rounded-xl border border-zinc-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{v.title}</h4>
                    <p className="text-[11px] text-zinc-400 truncate">Por: {v.creator?.display_name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                      <span>{v.views_count} views</span>
                      <span>•</span>
                      <span>{v.likes_count} curtidas</span>
                      {v.is_premium && (
                        <span className="text-amber-400 font-bold">• VIP R$ {v.premium_price}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteVideo(v.id)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-950/70 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Remover vídeo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Creators */}
      {activeTab === 'creators' && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white font-display">Criadores de Conteúdo</h3>
          <div className="space-y-2.5">
            {creators.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-[#141419] border border-zinc-800 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={c.avatar_url}
                    alt={c.display_name}
                    className="w-12 h-12 rounded-full object-cover border border-zinc-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
                      {c.display_name}
                      {c.verified && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    </h4>
                    <p className="text-xs text-zinc-400">@{c.handle}</p>
                    <span className="text-[11px] text-emerald-400 mt-0.5 block">
                      Saldo em carteira: R$ {c.wallet_balance.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleVerifyCreator(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    c.verified
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {c.verified ? 'Verificado VIP' : 'Verificar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: Categorias & Tags Dinâmicas */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Informative notice explaining full control */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-rose-950/30 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <FolderTree className="w-4 h-4" />
              <span>Gerenciador de Categorias & Tags (Exclusivo do Administrador)</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Você pode cadastrar, renomear, desativar ou excluir categorias e tags diretamente pelo sistema.
              Todas as alterações entram em vigor <strong>em tempo real</strong>: os criadores verão as categorias atualizadas ao publicar vídeos, e os membros poderão filtrar por elas na aba <strong>Explorar</strong>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Create Category Form */}
            <div className="p-5 rounded-2xl bg-[#141419] border border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-500" />
                Cadastrar Nova Categoria
              </h3>
              <form onSubmit={handleCreateCategory} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex: Ensaio Glamour, Cosplay, Fitness..."
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Descrição Curta (opcional)
                  </label>
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Breve descrição da categoria..."
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Salvar Categoria no Sistema</span>
                </button>
              </form>
            </div>

            {/* Create Tag Form */}
            <div className="p-5 rounded-2xl bg-[#141419] border border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                Cadastrar Nova #Hashtag
              </h3>
              <form onSubmit={handleCreateTag} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nome da Tag (sem #) *
                  </label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Ex: ensaio, vip, glamour, bastidores..."
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>

                <p className="text-[11px] text-zinc-400">
                  Tags cadastradas ajudam na indexação do mecanismo de busca inteligente e no algoritmo de recomendações.
                </p>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Tag</span>
                </button>
              </form>

              {/* Tag Cloud */}
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-2 font-semibold">Tags Ativas ({tags.length}):</span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {tags.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                    >
                      #{t.name}
                      <button
                        onClick={() => handleDeleteTag(t.id)}
                        className="text-zinc-500 hover:text-rose-400 ml-1 cursor-pointer"
                        title="Remover tag"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Categories Table / List */}
          <div className="p-5 rounded-2xl bg-[#141419] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-rose-500" />
                Categorias Registradas ({categories.length})
              </h3>
              <span className="text-xs text-zinc-400">
                {categories.filter(c => c.is_active).length} ativas para criadores e membros
              </span>
            </div>

            <div className="divide-y divide-zinc-800/80">
              {categories.map((cat, idx) => {
                const videoCount = videos.filter(v => v.category === cat.name).length;
                return (
                  <div
                    key={cat.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white font-display">{cat.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            cat.is_active
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {cat.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            ({videoCount} {videoCount === 1 ? 'vídeo' : 'vídeos'})
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-[11px] text-zinc-400 mt-0.5">{cat.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                          cat.is_active
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                            : 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {cat.is_active ? 'Desativar' : 'Ativar'}
                      </button>

                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                        title="Excluir categoria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Cibersegurança & LGPD */}
      {activeTab === 'security_lgpd' && (
        <div className="space-y-6">
          {/* Security Overview Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#141419] border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Criptografia & Sessão</span>
              </div>
              <p className="text-xl font-black text-white font-display">TLS 1.3 / HTTPS</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Tráfego 100% criptografado de ponta a ponta com certificados SSL/TLS modernos e cookies protegidos HttpOnly.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#141419] border border-sky-500/30 space-y-2">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                <Lock className="w-4 h-4" />
                <span>Row Level Security (RLS)</span>
              </div>
              <p className="text-xl font-black text-white font-display">Isolamento Ativo</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Tabelas protegidas por políticas RLS no PostgreSQL (Supabase). Usuários não acessam dados de terceiros.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#141419] border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <FileText className="w-4 h-4" />
                <span>LGPD & Compliance 18+</span>
              </div>
              <p className="text-xl font-black text-white font-display">Lei 13.709/2018</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Consentimento prévio registrado, verificação legal de maioridade (18+) e canal de direitos do titular.
              </p>
            </div>
          </div>

          {/* LGPD Tools Section */}
          <div className="p-6 rounded-3xl bg-[#141419] border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Direitos do Titular de Dados (Art. 18 LGPD)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Mecanismos integrados para atendimento a solicitações de titulares de dados e órgãos fiscalizadores (ANPD).
                </p>
              </div>

              <button
                onClick={handleExportLgpd}
                className="px-4 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Relatório LGPD (.json)</span>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-zinc-200">Encarregado de Dados (DPO)</h4>
                <p className="text-[11px] text-zinc-400">
                  Canal de comunicação dedicado: <strong className="text-white">dpo@velvetvip.com</strong>.
                  Respostas a requisições de titulares e ANPD em prazo legal de até 15 dias.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-zinc-200">Bases Legais Utilizadas</h4>
                <p className="text-[11px] text-zinc-400">
                  Execução de contrato (compra de vídeos e assinaturas), consentimento livre e informado (cookies e 18+) e cumprimento de obrigação legal.
                </p>
              </div>
            </div>
          </div>

          {/* Cyber Security Audit Logs */}
          <div className="p-6 rounded-3xl bg-[#141419] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-rose-500" />
                  Logs de Cibersegurança & Auditoria em Tempo Real
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Registro de tentativas de acesso, verificações de idade e operações sensíveis no sistema.
                </p>
              </div>

              <button
                onClick={loadData}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer flex items-center gap-1"
                title="Atualizar Logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {securityLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      log.status === 'success'
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-500'
                        : log.status === 'warning'
                        ? 'bg-amber-400 shadow-sm shadow-amber-500'
                        : 'bg-rose-500 shadow-sm shadow-rose-500'
                    }`} />
                    <div>
                      <span className="font-bold text-white block">{log.event}</span>
                      <span className="text-[11px] text-zinc-400">{log.details}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-zinc-400 block font-mono">{log.ip_address}</span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')} - {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
