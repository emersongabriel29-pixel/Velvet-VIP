import React, { useEffect, useState } from 'react';
import { BarChart3, Settings, ShieldAlert, Users, Tag, Megaphone, DollarSign, Save, Loader2, CheckCircle2, Play, Pause, Eye, MessageSquare } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type Plan = { id:string; name:string; slug:string; monthly_price:number; semiannual_price:number; annual_price:number; ads_enabled:boolean; benefits:any; is_active:boolean };
type Report = { id:string; reason:string; status:string; priority:string; target_type:string; target_id:string; description?:string; created_at:string };
type ModerationItem = { id:string; kind:'video'|'comment'|'live'; title:string; detail:string; status:string; created_at:string };

export const AdminCommandCenter: React.FC<{ onSelectVideo?: (id:string)=>void }> = ({ onSelectVideo }) => {
  const { currentUser } = useAuth();
  const [tab,setTab] = useState<'overview'|'plans'|'settings'|'catalog'|'moderation'|'creators'|'ads'>('overview');
  const [plans,setPlans] = useState<Plan[]>([]);
  const [settings,setSettings] = useState({platform_fee_percent:15,tips_fee_percent:10,free_content_policy:'sensual_only'});
  const [categories,setCategories] = useState<any[]>([]);
  const [tags,setTags] = useState<any[]>([]);
  const [creatorRows,setCreatorRows] = useState<any[]>([]);
  const [campaigns,setCampaigns] = useState<any[]>([]);
  const [reports,setReports] = useState<Report[]>([]);
  const [moderation,setModeration] = useState<ModerationItem[]>([]);
  const [counts,setCounts] = useState({users:0,creators:0,videos:0,revenue:0,subscribers:0,pendingReports:0});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState<string|null>(null);
  const [message,setMessage] = useState('');
  const [newCampaign,setNewCampaign] = useState({name:'',advertiser_name:'',placement:'feed',budget:'',target_url:''});

  const load = async () => {
    if (!supabase || !isSupabaseConfigured) { setLoading(false); setMessage('Configure o Supabase para ativar o centro administrativo real.'); return; }
    setLoading(true);
    try {
      const [users,creators,videos,paid,subs,reportRows,planRows,settingsRow,categoryRows,tagRows,creatorList,campaignRows,videoRows,commentRows,liveRows] = await Promise.all([
        supabase.from('profiles').select('id',{count:'exact',head:true}),
        supabase.from('creators').select('id',{count:'exact',head:true}),
        supabase.from('videos').select('id',{count:'exact',head:true}),
        supabase.from('checkout_sessions').select('amount').eq('status','paid'),
        supabase.from('creator_subscriptions').select('user_id',{count:'exact',head:true}).eq('status','active'),
        supabase.from('safety_reports').select('id,reason,status,priority,target_type,target_id,created_at,description').in('status',['pending','reviewing']).order('created_at',{ascending:false}).limit(100),
        supabase.from('platform_plans').select('*').order('monthly_price'),
        supabase.from('platform_settings').select('*').maybeSingle(),
        supabase.from('system_categories').select('id,name,slug,is_active,sort_order').order('sort_order'),
        supabase.from('system_tags').select('id,name,slug,is_active').order('name'),
        supabase.from('creators').select('id,display_name,verified,is_approved,identity_status').order('created_at',{ascending:false}).limit(100),
        supabase.from('ad_campaigns').select('*').order('created_at',{ascending:false}).limit(100),
        supabase.from('videos').select('id,title,moderation_status,created_at').in('moderation_status',['pending','reviewing']).order('created_at',{ascending:false}).limit(100),
        supabase.from('comments').select('id,content,moderation_status,created_at').eq('moderation_status','pending').order('created_at',{ascending:false}).limit(100),
        supabase.from('live_sessions').select('id,title,moderation_status,created_at').eq('moderation_status','pending').order('created_at',{ascending:false}).limit(100),
      ]);
      const error=[users,creators,videos,paid,subs,reportRows,planRows,settingsRow,categoryRows,tagRows,creatorList,campaignRows,videoRows,commentRows,liveRows].find(x=>x.error)?.error;
      if(error) throw error;
      setCounts({users:users.count||0,creators:creators.count||0,videos:videos.count||0,revenue:(paid.data||[]).reduce((s:any,r:any)=>s+Number(r.amount||0),0),subscribers:subs.count||0,pendingReports:(reportRows.data||[]).length});
      setPlans((planRows.data||[]) as Plan[]);
      if(settingsRow.data) setSettings({platform_fee_percent:Number(settingsRow.data.platform_fee_percent),tips_fee_percent:Number(settingsRow.data.tips_fee_percent),free_content_policy:settingsRow.data.free_content_policy});
      setCategories(categoryRows.data||[]); setTags(tagRows.data||[]); setCreatorRows(creatorList.data||[]); setCampaigns(campaignRows.data||[]); setReports((reportRows.data||[]) as Report[]);
      setModeration([
        ...(videoRows.data||[]).map((x:any)=>({id:x.id,kind:'video',title:x.title||'Vídeo sem título',detail:'Vídeo aguardando análise',status:x.moderation_status,created_at:x.created_at})),
        ...(commentRows.data||[]).map((x:any)=>({id:x.id,kind:'comment',title:'Comentário',detail:x.content,status:x.moderation_status,created_at:x.created_at})),
        ...(liveRows.data||[]).map((x:any)=>({id:x.id,kind:'live',title:x.title||'Live',detail:'Live aguardando análise',status:x.moderation_status,created_at:x.created_at}))
      ]);
    } catch(error:any) { setMessage(error.message||'Falha ao carregar os dados administrativos.'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{load();},[]);

  const savePlan=async(plan:Plan)=>{
    if(!supabase)return; setSaving(plan.id); setMessage('');
    const benefits=typeof plan.benefits==='string'?plan.benefits.split('\n').map(x=>x.trim()).filter(Boolean):plan.benefits;
    const {error}=await supabase.from('platform_plans').update({name:plan.name,monthly_price:Number(plan.monthly_price),semiannual_price:Number(plan.semiannual_price),annual_price:Number(plan.annual_price),ads_enabled:plan.ads_enabled,is_active:plan.is_active,benefits}).eq('id',plan.id);
    setMessage(error?.message||'Plano geral atualizado e salvo no Supabase.'); setSaving(null);
  };
  const saveSettings=async()=>{
    if(!supabase)return; setSaving('settings');
    const {error}=await supabase.from('platform_settings').upsert({...settings,id:true,updated_by:currentUser.id});
    setMessage(error?.message||'Taxas e política de conteúdo salvas permanentemente.'); setSaving(null);
  };
  const updateCreator=async(creator:any,patch:Record<string,unknown>)=>{
    if(!supabase)return; const {error}=await supabase.from('creators').update(patch).eq('id',creator.id);
    setMessage(error?.message||'Criador atualizado.'); if(!error) await load();
  };
  const moderate=async(item:ModerationItem,approved:boolean)=>{
    if(!supabase)return;
    const table=item.kind==='video'?'videos':item.kind==='comment'?'comments':'live_sessions';
    const {error}=await supabase.from(table).update({moderation_status:approved?'approved':'removed',...(item.kind==='video'?{is_removed:!approved}:{})}).eq('id',item.id);
    setMessage(error?.message||(approved?'Conteúdo aprovado.':'Conteúdo removido.')); if(!error) await load();
  };
  const updateReport=async(report:Report,status:string)=>{
    if(!supabase)return; const {error}=await supabase.from('safety_reports').update({status,resolved_at:status==='action_taken'||status==='dismissed'?new Date().toISOString():null}).eq('id',report.id);
    setMessage(error?.message||'Denúncia atualizada.'); if(!error) await load();
  };
  const saveCampaign=async(e:React.FormEvent)=>{
    e.preventDefault(); if(!supabase)return; setSaving('campaign');
    const {error}=await supabase.from('ad_campaigns').insert({...newCampaign,budget:Number(newCampaign.budget||0),created_by:currentUser.id});
    setMessage(error?.message||'Campanha criada no Supabase.'); setSaving(null); if(!error){setNewCampaign({name:'',advertiser_name:'',placement:'feed',budget:'',target_url:''});await load();}
  };
  const toggleCampaign=async(c:any)=>{
    if(!supabase)return; const status=c.status==='active'?'paused':'active'; const {error}=await supabase.from('ad_campaigns').update({status}).eq('id',c.id);
    setMessage(error?.message||'Status da campanha salvo.'); if(!error) await load();
  };

  if(currentUser.role!=='admin') return <div className="min-h-screen bg-[#09090b] px-6 pt-28 text-white"><div className="mx-auto max-w-xl rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-rose-400"/><h1 className="mt-4 text-2xl font-black">Acesso restrito</h1><p className="mt-2 text-sm text-zinc-400">Somente administradores aprovados podem acessar esta área.</p></div></div>;

  const nav=[['overview','Visão geral',<BarChart3 className="h-4 w-4"/>],['plans','Planos gerais',<DollarSign className="h-4 w-4"/>],['settings','Taxas e regras',<Settings className="h-4 w-4"/>],['catalog','Categorias e tags',<Tag className="h-4 w-4"/>],['moderation','Fila central',<ShieldAlert className="h-4 w-4"/>],['creators','Criadores',<Users className="h-4 w-4"/>],['ads','Campanhas',<Megaphone className="h-4 w-4"/>]] as const;
  const panel=tab==='overview'?<section><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['Usuários',counts.users,Users],['Criadores',counts.creators,Users],['Vídeos',counts.videos,Eye],['Receita confirmada',`R$ ${counts.revenue.toFixed(2).replace('.',',')}`,DollarSign],['Assinaturas ativas',counts.subscribers,CheckCircle2],['Pendências de segurança',counts.pendingReports+moderation.length,ShieldAlert]].map(([label,value,Icon]:any)=><div key={label} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><Icon className="h-6 w-6 text-rose-400"/><p className="mt-4 text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div><div className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><h2 className="font-bold">Visão operacional</h2><p className="mt-2 text-sm text-zinc-400">Indicadores carregados do Supabase: usuários, criadores, vídeos, pagamentos confirmados, assinaturas, denúncias e fila de moderação.</p></div></section>
  :tab==='plans'?<section><h2 className="mb-4 text-xl font-bold">Planos gerais da plataforma</h2><div className="grid gap-4 md:grid-cols-3">{plans.map(plan=><article key={plan.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3"><input value={plan.name} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,name:e.target.value}:x))} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-bold"/><label className="block text-xs text-zinc-500">Mensal (R$)<input type="number" min="0" step="0.01" value={plan.monthly_price} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,monthly_price:Number(e.target.value)}:x))} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></label><label className="block text-xs text-zinc-500">Semestral (R$)<input type="number" min="0" step="0.01" value={plan.semiannual_price} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,semiannual_price:Number(e.target.value)}:x))} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></label><label className="block text-xs text-zinc-500">Anual (R$)<input type="number" min="0" step="0.01" value={plan.annual_price} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,annual_price:Number(e.target.value)}:x))} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></label><textarea value={Array.isArray(plan.benefits)?plan.benefits.join('\n'):plan.benefits||''} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,benefits:e.target.value}:x))} placeholder="Um benefício por linha" className="min-h-20 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={plan.is_active} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,is_active:e.target.checked}:x))}/> Plano ativo</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={plan.ads_enabled} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,ads_enabled:e.target.checked}:x))}/> Exibe anúncios</label><button onClick={()=>savePlan(plan)} disabled={saving===plan.id} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2 text-sm font-bold disabled:opacity-50">{saving===plan.id?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Salvar plano</button></article>)}</div></section>
  :tab==='settings'?<section className="max-w-xl"><h2 className="mb-4 text-xl font-bold">Taxas e regras persistentes</h2><div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4"><label className="block text-sm">Taxa da plataforma em assinaturas/PPV (%)<input type="number" min="0" max="100" step=".01" value={settings.platform_fee_percent} onChange={e=>setSettings({...settings,platform_fee_percent:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></label><label className="block text-sm">Taxa da plataforma em gorjetas (%)<input type="number" min="0" max="100" step=".01" value={settings.tips_fee_percent} onChange={e=>setSettings({...settings,tips_fee_percent:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></label><label className="block text-sm">Política de conteúdo gratuito<select value={settings.free_content_policy} onChange={e=>setSettings({...settings,free_content_policy:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"><option value="sensual_only">Somente sensual</option><option value="short_vertical_only">Somente vídeos curtos verticais</option></select></label><button onClick={saveSettings} disabled={saving==='settings'} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold">{saving==='settings'?'Salvando...':'Salvar regras'}</button></div></section>
  :tab==='catalog'?<section><h2 className="mb-4 text-xl font-bold">Categorias ({categories.length}) e tags ({tags.length})</h2><div className="grid gap-4 md:grid-cols-2"><div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 flex flex-wrap gap-2">{categories.map(x=><span key={x.id} className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">{x.name}</span>)}</div><div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 flex flex-wrap gap-2">{tags.map(x=><span key={x.id} className="rounded-full bg-rose-500/10 px-3 py-1 text-xs text-rose-300">#{x.name}</span>)}</div></div></section>
  :tab==='moderation'?<section><h2 className="mb-4 text-xl font-bold">Fila central de moderação</h2><div className="space-y-3">{moderation.map(item=><article key={item.kind+item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div className="flex items-center gap-2 text-xs text-amber-300">{item.kind==='video'?<Play className="h-4 w-4"/>:item.kind==='comment'?<MessageSquare className="h-4 w-4"/>:<Megaphone className="h-4 w-4"/>}<span>{item.kind.toUpperCase()} • {item.status}</span></div><p className="mt-2 font-bold">{item.title}</p><p className="mt-1 max-w-3xl truncate text-sm text-zinc-400">{item.detail}</p><div className="mt-3 flex gap-2"><button onClick={()=>moderate(item,true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold">Aprovar</button><button onClick={()=>moderate(item,false)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold">Remover</button>{item.kind==='video'&&onSelectVideo&&<button onClick={()=>onSelectVideo(item.id)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold">Abrir</button>}</div></article>)}{reports.map(report=><article key={report.id} className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4"><p className="font-bold">Denúncia: {report.reason}</p><p className="mt-1 text-sm text-zinc-400">{report.description||'Sem descrição'}</p><div className="mt-3 flex gap-2"><button onClick={()=>updateReport(report,'action_taken')} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold">Aplicar ação</button><button onClick={()=>updateReport(report,'dismissed')} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold">Arquivar</button></div></article>)}{moderation.length===0&&reports.length===0&&<Empty text="Nenhuma pendência na fila."/>}</div></section>
  :tab==='creators'?<section><h2 className="mb-4 text-xl font-bold">Aprovação e verificação de criadores</h2><div className="space-y-3">{creatorRows.map(c=><article key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div><p className="font-bold">{c.display_name}</p><p className="text-xs text-zinc-500">Identidade: {c.identity_status||'pending'} • {c.is_approved?'Aprovado':'Pendente'}</p></div><div className="flex gap-2"><button onClick={()=>updateCreator(c,{is_approved:!c.is_approved})} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold">{c.is_approved?'Reprovar':'Aprovar'}</button><button onClick={()=>updateCreator(c,{verified:!c.verified,identity_status:!c.verified?'verified':'pending'})} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold">{c.verified?'Remover selo':'Verificar'}</button></div></article>)}{creatorRows.length===0&&<Empty text="Nenhum criador encontrado."/>}</div></section>
  :<section><h2 className="mb-4 text-xl font-bold">Campanhas de anúncios</h2><form onSubmit={saveCampaign} className="mb-5 grid gap-2 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 md:grid-cols-5"><input required placeholder="Nome da campanha" value={newCampaign.name} onChange={e=>setNewCampaign({...newCampaign,name:e.target.value})} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/><input required placeholder="Anunciante" value={newCampaign.advertiser_name} onChange={e=>setNewCampaign({...newCampaign,advertiser_name:e.target.value})} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/><input placeholder="Posicionamento" value={newCampaign.placement} onChange={e=>setNewCampaign({...newCampaign,placement:e.target.value})} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/><input type="number" min="0" step=".01" placeholder="Orçamento" value={newCampaign.budget} onChange={e=>setNewCampaign({...newCampaign,budget:e.target.value})} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/><button disabled={saving==='campaign'} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold">{saving==='campaign'?'Criando...':'Criar campanha'}</button></form><div className="space-y-3">{campaigns.map(c=><article key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div><p className="font-bold">{c.name}</p><p className="text-xs text-zinc-500">{c.advertiser_name} • {c.placement} • {c.impressions||0} impressões • {c.clicks||0} cliques • R$ {Number(c.budget||0).toFixed(2).replace('.',',')}</p></div><button onClick={()=>toggleCampaign(c)} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold">{c.status==='active'?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{c.status==='active'?'Pausar':'Ativar'}</button></article>)}</div>{campaigns.length===0&&<Empty text="Nenhuma campanha cadastrada."/>}</section>;

  return <div className="min-h-screen bg-[#09090b] px-4 pb-24 pt-24 text-white"><div className="mx-auto max-w-6xl"><div className="mb-8 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Controle operacional</p><h1 className="mt-2 text-3xl font-black">Centro do Administrador</h1><p className="mt-2 text-zinc-400">Gestão persistente de planos, taxas, catálogo, criadores, anúncios, pagamentos e segurança.</p></div><Settings className="h-8 w-8 text-zinc-600"/></div>{message&&<div role="status" className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{message}</div>}<div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2 sm:grid-cols-4 md:grid-cols-7">{nav.map(([id,label,icon])=><button key={id} onClick={()=>setTab(id)} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-bold ${tab===id?'bg-rose-600 text-white':'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>{icon}{label}</button>)}</div>{loading?<div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-rose-400"/></div>:panel}</div></div>;
};

const Empty:React.FC<{text:string}>=({text})=><div className="rounded-3xl border border-dashed border-zinc-700 p-12 text-center text-sm text-zinc-500">{text}</div>;
