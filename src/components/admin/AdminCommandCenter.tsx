import React, { useEffect, useState } from 'react';
import { BarChart3, Settings, ShieldAlert, Users, Tag, Megaphone, DollarSign, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type Plan = { id: string; name: string; slug: string; monthly_price: number; ads_enabled: boolean; benefits: string[]; is_active: boolean };
type Report = { id: string; reason: string; status: string; priority: string; created_at: string; description?: string };

export const AdminCommandCenter: React.FC<{ onSelectVideo?: (id: string) => void }> = ({ onSelectVideo }) => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<'overview' | 'plans' | 'catalog' | 'moderation' | 'creators' | 'ads'>('overview');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [creatorRows, setCreatorRows] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState({ users: 0, creators: 0, videos: 0, revenue: 0, subscribers: 0, pendingReports: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!supabase || !isSupabaseConfigured) { setLoading(false); setMessage('Configure o Supabase para ativar o centro administrativo real.'); return; }
    setLoading(true);
    try {
      const [users, creators, videos, paid, subs, reportRows, planRows, categoryRows, tagRows, creatorList, campaignRows] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('creators').select('id', { count: 'exact', head: true }),
        supabase.from('videos').select('id', { count: 'exact', head: true }),
        supabase.from('checkout_sessions').select('amount').eq('status', 'paid'),
        supabase.from('creator_subscriptions').select('user_id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('safety_reports').select('id,reason,status,priority,created_at,description').in('status', ['pending', 'reviewing']).order('created_at', { ascending: false }).limit(100),
        supabase.from('platform_plans').select('*').order('monthly_price'),
        supabase.from('system_categories').select('id,name,slug,is_active,sort_order').order('sort_order'),
        supabase.from('system_tags').select('id,name,slug,is_active').order('name'),
        supabase.from('creators').select('id,display_name,verified,is_approved,identity_status').order('created_at', { ascending: false }).limit(100),
        supabase.from('ad_campaigns').select('id,name,advertiser_name,status,placement,impressions,clicks').order('created_at', { ascending: false }).limit(100),
      ]);
      const error = [users, creators, videos, paid, subs, reportRows, planRows, categoryRows, tagRows, creatorList, campaignRows].find(result => result.error)?.error;
      if (error) throw error;
      setCounts({ users: users.count || 0, creators: creators.count || 0, videos: videos.count || 0, revenue: (paid.data || []).reduce((sum, row: any) => sum + Number(row.amount || 0), 0), subscribers: subs.count || 0, pendingReports: (reportRows.data || []).length });
      setPlans((planRows.data || []) as Plan[]);
      setCategories(categoryRows.data || []);
      setTags(tagRows.data || []);
      setCreatorRows(creatorList.data || []);
      setCampaigns(campaignRows.data || []);
      setReports((reportRows.data || []) as Report[]);
    } catch (error: any) { setMessage(error.message || 'Falha ao carregar os dados administrativos.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const savePlan = async (plan: Plan) => {
    if (!supabase) return;
    setSaving(plan.id); setMessage('');
    const { error } = await supabase.from('platform_plans').update({ name: plan.name, monthly_price: Number(plan.monthly_price), ads_enabled: plan.ads_enabled, benefits: plan.benefits }).eq('id', plan.id);
    if (error) setMessage(error.message); else setMessage('Plano atualizado com sucesso.'); 
    setSaving(null);
  };

  const updateCreator = async (creator: any, patch: Record<string, unknown>) => {
    if (!supabase) return;
    const { error } = await supabase.from('creators').update(patch).eq('id', creator.id);
    if (error) setMessage(error.message); else { setMessage('Criador atualizado.'); await load(); }
  };

  const updateReport = async (report: Report, status: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('safety_reports').update({ status, resolved_at: status === 'action_taken' || status === 'dismissed' ? new Date().toISOString() : null }).eq('id', report.id);
    if (error) setMessage(error.message); else { setMessage('Denúncia atualizada.'); await load(); }
  };

  if (currentUser.role !== 'admin') return <div className="min-h-screen bg-[#09090b] px-6 pt-28 text-white"><div className="mx-auto max-w-xl rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-rose-400" /><h1 className="mt-4 text-2xl font-black">Acesso restrito</h1><p className="mt-2 text-sm text-zinc-400">Somente administradores aprovados podem acessar esta área.</p></div></div>;

  const nav = [
    ['overview', 'Visão geral', <BarChart3 className="h-4 w-4" />],
    ['plans', 'Planos e valores', <DollarSign className="h-4 w-4" />],
    ['catalog', 'Categorias e tags', <Tag className="h-4 w-4" />],
    ['moderation', 'Moderação', <ShieldAlert className="h-4 w-4" />],
    ['creators', 'Criadores', <Users className="h-4 w-4" />],
    ['ads', 'Publicidade', <Megaphone className="h-4 w-4" />],
  ] as const;

  return <div className="min-h-screen bg-[#09090b] px-4 pb-24 pt-24 text-white"><div className="mx-auto max-w-6xl">
    <div className="mb-8 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Controle operacional</p><h1 className="mt-2 text-3xl font-black">Centro do Administrador</h1><p className="mt-2 text-zinc-400">Gerencie planos, catálogo, criadores, anúncios, pagamentos e segurança.</p></div><Settings className="h-8 w-8 text-zinc-600" /></div>
    {message && <div role="status" className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{message}</div>}
    <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2 sm:grid-cols-3 md:grid-cols-6">{nav.map(([id, label, icon]) => <button key={id} onClick={() => setTab(id)} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-bold ${tab === id ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>{icon}{label}</button>)}</div>
    {loading ? <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-rose-400" /></div> : tab === 'overview' ? <section><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['Usuários', counts.users, Users], ['Criadores', counts.creators, Users], ['Vídeos', counts.videos, BarChart3], ['Receita confirmada', `R$ ${counts.revenue.toFixed(2).replace('.', ',')}`, DollarSign], ['Assinaturas ativas', counts.subscribers, CheckCircle2], ['Denúncias pendentes', counts.pendingReports, ShieldAlert]].map(([label, value, Icon]: any) => <div key={label as string} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><Icon className="h-6 w-6 text-rose-400" /><p className="mt-4 text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div><div className="mt-5 rounded-3xl border border-amber-500/20 bg-amber-950/10 p-6"><h2 className="font-bold">Relatórios operacionais</h2><p className="mt-2 text-sm text-zinc-400">Acompanhe receita confirmada, assinaturas ativas, volume de conteúdo e fila de segurança em tempo real. Valores não são estimados nem simulados.</p></div></section> : tab === 'plans' ? <section><h2 className="mb-4 text-xl font-bold">Planos gerais da plataforma</h2><div className="grid gap-4 md:grid-cols-3">{plans.map(plan => <article key={plan.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><input value={plan.name} onChange={e => setPlans(value => value.map(item => item.id === plan.id ? { ...item, name: e.target.value } : item))} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-bold" /><label className="mt-4 block text-xs text-zinc-500">Preço mensal (R$)</label><input type="number" min="0" step="0.01" value={plan.monthly_price} onChange={e => setPlans(value => value.map(item => item.id === plan.id ? { ...item, monthly_price: Number(e.target.value) } : item))} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2" /><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={plan.ads_enabled} onChange={e => setPlans(value => value.map(item => item.id === plan.id ? { ...item, ads_enabled: e.target.checked } : item))} /> Exibe anúncios</label><button onClick={() => savePlan(plan)} disabled={saving === plan.id} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2 text-sm font-bold disabled:opacity-50">{saving === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar plano</button></article>)}</div></section> : tab === 'moderation' ? <section><h2 className="mb-4 text-xl font-bold">Fila de denúncias</h2>{reports.length === 0 ? <Empty text="Nenhuma denúncia pendente." /> : <div className="space-y-3">{reports.map(report => <article key={report.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{report.reason}</span><span className="text-xs text-amber-300">{report.priority}</span></div><p className="mt-2 text-sm text-zinc-400">{report.description || 'Sem descrição adicional.'}</p><div className="mt-3 flex gap-2"><button onClick={() => updateReport(report, 'action_taken')} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold">Aplicar ação</button><button onClick={() => updateReport(report, 'dismissed')} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold">Arquivar</button></div></article>)}</div>}</section> : tab === 'catalog' ? <section><h2 className="mb-4 text-xl font-bold">Categorias e tags</h2><div className="grid gap-4 md:grid-cols-2"><div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><h3 className="font-bold">Categorias ({categories.length})</h3><div className="mt-4 flex flex-wrap gap-2">{categories.map(item => <span key={item.id} className={`rounded-full px-3 py-1 text-xs ${item.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>{item.name}</span>)}</div></div><div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><h3 className="font-bold">Tags ({tags.length})</h3><div className="mt-4 flex flex-wrap gap-2">{tags.map(item => <span key={item.id} className={`rounded-full px-3 py-1 text-xs ${item.is_active ? 'bg-rose-500/10 text-rose-300' : 'bg-zinc-800 text-zinc-500'}`}>#{item.name}</span>)}</div></div></div></section> : tab === 'creators' ? <section><h2 className="mb-4 text-xl font-bold">Gestão de criadores</h2>{creatorRows.length === 0 ? <Empty text="Nenhum criador encontrado." /> : <div className="space-y-3">{creatorRows.map(creator => <article key={creator.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div><p className="font-bold">{creator.display_name}</p><p className="text-xs text-zinc-500">Identidade: {creator.identity_status || 'pending'} • {creator.is_approved ? 'Aprovado' : 'Pendente'}</p></div><div className="flex gap-2"><button onClick={() => updateCreator(creator, { is_approved: !creator.is_approved })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold">{creator.is_approved ? 'Reprovar' : 'Aprovar'}</button><button onClick={() => updateCreator(creator, { verified: !creator.verified, identity_status: !creator.verified ? 'verified' : 'pending' })} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold">{creator.verified ? 'Remover verificação' : 'Verificar'}</button></div></article>)}</div>}</section> : <section><h2 className="mb-4 text-xl font-bold">Publicidade</h2>{campaigns.length === 0 ? <Empty text="Nenhuma campanha cadastrada." /> : <div className="space-y-3">{campaigns.map(campaign => <article key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div><p className="font-bold">{campaign.name}</p><p className="text-xs text-zinc-500">{campaign.advertiser_name} • {campaign.placement} • {campaign.impressions || 0} impressões • {campaign.clicks || 0} cliques</p></div><span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300">{campaign.status}</span></article>)}</div>}</section>}  </div></div>;
};

const Empty: React.FC<{ text: string }> = ({ text }) => <div className="rounded-3xl border border-dashed border-zinc-700 p-12 text-center text-sm text-zinc-500">{text}</div>;
