import React, { useEffect, useState } from 'react';
import { BarChart3, Settings, ShieldAlert, Users, Tag, Megaphone, DollarSign, Save, Loader2, CheckCircle2, Play, Pause, Eye, MessageSquare, Settings2 } from 'lucide-react';
import { supabase, isDemoMode } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { AdminEditor } from './AdminEditor';
import { dbService } from '../../services/db';
import { PunishmentsPanel } from './PunishmentsPanel';

type Plan = { id:string; name:string; slug:string; monthly_price:number; semiannual_price:number; annual_price:number; ads_enabled:boolean; benefits:any; is_active:boolean };
type Report = { id:string; reason:string; status:string; target_type:string; target_id:string; description?:string; admin_notes?:string; created_at:string };
type ModerationItem = { id:string; kind:'video'|'comment'|'live'; title:string; detail:string; status:string; created_at:string };

export const AdminCommandCenter: React.FC<{ onSelectVideo?: (id:string)=>void }> = ({ onSelectVideo }) => {
  const { currentUser } = useAuth();
  const [tab,setTab] = useState<'overview'|'editor'|'plans'|'settings'|'catalog'|'moderation'|'punishments'|'creators'|'ads'>('overview');
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
  const [catalogDraft,setCatalogDraft] = useState({kind:'category' as 'category'|'tag',name:''});
  const [newCampaign,setNewCampaign] = useState({name:'',advertiser_name:'',placement:'feed',budget:'',target_url:'',start_at:'',end_at:'',audience:'all',creative_url:'',status:'draft'});

  const load = async () => {
    if (isDemoMode) { setCategories(dbService.getCategories(true)); setTags(dbService.getTags()); setLoading(false); setMessage('Prévia local de demonstração.'); return; }
    if (!supabase) { setLoading(false); setMessage('Backend administrativo indisponível.'); return; }
    setLoading(true);
    try {
      const [users,creators,videos,paid,subs,reportRows,planRows,settingsRow,categoryRows,tagRows,creatorList,campaignRows,videoRows,commentRows,liveRows] = await Promise.all([
        supabase.from('profiles').select('id',{count:'exact',head:true}),
        supabase.from('creators').select('id',{count:'exact',head:true}),
        supabase.from('videos').select('id',{count:'exact',head:true}),
        supabase.from('checkout_sessions').select('amount').eq('status','paid'),
        supabase.from('creator_subscriptions').select('user_id',{count:'exact',head:true}).eq('status','active'),
        supabase.from('reports').select('id,reason,status,target_type,target_id,created_at,description,admin_notes').in('status',['pending','reviewing']).order('created_at',{ascending:false}).limit(100),
        supabase.from('platform_plans').select('*').order('monthly_price'),
        supabase.from('platform_settings').select('*').maybeSingle(),
        supabase.from('system_categories').select('id,name,slug,is_active,sort_order').order('sort_order'),
        supabase.from('system_tags').select('id,name,slug,is_active').order('name'),
        supabase.from('creators').select('id,display_name,verified,is_approved,identity_status,content_rights_confirmed,identity_provider,identity_verified_at').order('created_at',{ascending:false}).limit(100),
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
    if(!supabase)return;
    if(patch.is_approved===true && (creator.identity_status!=='verified'||creator.content_rights_confirmed!==true)){
      setMessage('Aprovação bloqueada: identidade verificada e direitos de conteúdo são obrigatórios.'); return;
    }
    if('identity_status' in patch || 'identity_provider' in patch || 'identity_reference' in patch || 'identity_verified_at' in patch){
      setMessage('Identidade só pode ser atualizada pelo adaptador KYC confiável.'); return;
    }
    const {error}=await supabase.from('creators').update(patch).eq('id',creator.id);
    setMessage(error?.message||'Criador atualizado.'); if(!error) await load();
  };
  const moderate=async(item:ModerationItem,approved:boolean)=>{
    if(!supabase)return;
    const table=item.kind==='video'?'videos':item.kind==='comment'?'comments':'live_sessions';
    const {error}=await supabase.from(table).update({moderation_status:approved?'approved':'removed',...(item.kind==='video'?{is_removed:!approved}:{})}).eq('id',item.id);
    setMessage(error?.message||(approved?'Conteúdo aprovado.':'Conteúdo removido.')); if(!error) await load();
  };
  const openReportCase=async(report:Report)=>{
    if(!supabase)return;
    const {error}=await supabase.rpc('open_content_report_case',{p_report_id:report.id});
    if(error){setMessage(error.message);return;}
    setMessage('Caso de moderação aberto. Escolha a medida na aba Punições.');
    setTab('punishments'); await load();
  };
  const dismissReport=async(report:Report)=>{
    if(!supabase)return;
    const {error}=await supabase.rpc('resolve_content_report',{p_report_id:report.id,p_status:'dismissed',p_admin_notes:'Arquivada pelo administrador sem ação disciplinar.'});
    setMessage(error?.message||'Denúncia arquivada com trilha de auditoria.'); if(!error)await load();
  };
  const saveCampaign=async(e:React.FormEvent)=>{
    e.preventDefault(); if(!supabase)return; setSaving('campaign');
    const {error}=await supabase.from('ad_campaigns').insert({...newCampaign,budget:Number(newCampaign.budget||0),start_at:newCampaign.start_at||null,end_at:newCampaign.end_at||null,created_by:currentUser.id});
    setMessage(error?.message||'Campanha criada no Supabase.'); setSaving(null); if(!error){setNewCampaign({name:'',advertiser_name:'',placement:'feed',budget:'',target_url:'',start_at:'',end_at:'',audience:'all',creative_url:'',status:'draft'});await load();}
  };
  const slugify=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const createCatalogItem=async()=>{
    if(!supabase||!catalogDraft.name.trim())return;
    setSaving('catalog'); setMessage('');
    const table=catalogDraft.kind==='category'?'system_categories':'system_tags';
    const payload:any={name:catalogDraft.name.trim(),slug:slugify(catalogDraft.name),is_active:true};
    if(catalogDraft.kind==='category') payload.sort_order=categories.length+1;
    const {error}=await supabase.from(table).insert(payload);
    setMessage(error?.message||`${catalogDraft.kind==='category'?'Categoria':'Tag'} criada.`);
    if(!error){setCatalogDraft({...catalogDraft,name:''});await load();} setSaving(null);
  };
  const updateCatalogItem=async(kind:'category'|'tag',item:any,patch:any)=>{
    if(!supabase)return; setSaving(item.id); const table=kind==='category'?'system_categories':'system_tags';
    const next={...patch,...(patch.name?{slug:slugify(patch.name)}:{})};
    const {error}=await supabase.from(table).update(next).eq('id',item.id);
    setMessage(error?.message||'Item atualizado.'); if(!error)await load(); setSaving(null);
  };
  const deleteCatalogItem=async(kind:'category'|'tag',item:any)=>{
    if(!supabase||!window.confirm(`Excluir "${item.name}"? Conteúdos já associados podem impedir a exclusão.`))return;
    setSaving(item.id); const table=kind==='category'?'system_categories':'system_tags';
    const {error}=await supabase.from(table).delete().eq('id',item.id);
    setMessage(error?.message||'Item excluído.'); if(!error)await load(); setSaving(null);
  };

  const toggleCampaign=async(c:any)=>{
    if(!supabase)return; const status=c.status==='active'?'paused':'active'; const {error}=await supabase.from('ad_campaigns').update({status}).eq('id',c.id);
    setMessage(error?.message||'Status da campanha salvo.'); if(!error) await load();
  };

  if(currentUser.role!=='admin') return <div className="min-h-screen bg-[#09090b] px-6 pt-28 text-white"><div className="mx-auto max-w-xl rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-rose-400"/><h1 className="mt-4 text-2xl font-black">Acesso restrito</h1><p className="mt-2 text-sm text-zinc-400">Somente administradores aprovados podem acessar esta área.</p></div></div>;

  const nav=[['overview','Visão geral',<BarChart3 className="h-4 w-4"/>],['editor','Painel de edição',<Settings2 className="h-4 w-4"/>],['plans','Planos gerais',<DollarSign className="h-4 w-4"/>],['settings','Taxas e regras',<Settings className="h-4 w-4"/>],['catalog','Categorias e tags',<Tag className="h-4 w-4"/>],['moderation','Fila central',<ShieldAlert className="h-4 w-4"/>],['punishments','Punições',<ShieldAlert className="h-4 w-4"/>],['creators','Criadores',<Users className="h-4 w-4"/>],['ads','Campanhas',<Megaphone className="h-4 w-4"/>]] as const;
  const panel=tab==='punishments'?<PunishmentsPanel/>:tab==='editor'?<AdminEditor/>:tab==='overview'?<section><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['Usuários',counts.users,Users],['Criadores',counts.creators,Users],['Vídeos',counts.videos,Eye],['Receita confirmada',`R$ ${counts.revenue.toFixed(2).replace('.',',')}`,DollarSign],['Assinaturas ativas',counts.subscribers,CheckCircle2],['Pendências de segurança',counts.pendingReports+moderation.length,ShieldAlert]].map(([label,value,Icon]:any)=><div key={label} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><Icon className="h-6 w-6 text-rose-400"/><p className="mt-4 text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div><div className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><h2 className="font-bold">Visão operacional</h2><p className="mt-2 text-sm text-zinc-400">Indicadores carregados do Supabase: usuários, criadores, vídeos, pagamentos confirmados, assinaturas, denúncias e fila de moderação.</p></div></section>
  :tab==='plans'?<section><h2 className="mb-4 text-xl font-bold">Planos gerais da plataforma</h2><div className="grid gap-4 md:grid-cols-3">{plans.map(plan=><article key={plan.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3"><input value={plan.name} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,name:e.target.value}:x))} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-bold"/><label className="block text-xs text-zinc-500">Mensal (R$)<input type="number" min="0" step="0.01" value={plan.monthly_price} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,monthly_price:Number(e.target.value)}:x))} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></label><label className="block text-xs text-zinc-500">Semestral (R$)<input type="number" min="0" step="0.01" value={plan.semiannual_price} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,semiannual_price:Number(e.target.value)}:x))} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></label><label className="block text-xs text-zinc-500">Anual (R$)<input type="number" min="0" step="0.01" value={plan.annual_price} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,annual_price:Number(e.target.value)}:x))} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></label><textarea value={Array.isArray(plan.benefits)?plan.benefits.join('\n'):plan.benefits||''} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,benefits:e.target.value}:x))} placeholder="Um benefício por linha" className="min-h-20 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={plan.is_active} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,is_active:e.target.checked}:x))}/> Plano ativo</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={plan.ads_enabled} onChange={e=>setPlans(v=>v.map(x=>x.id===plan.id?{...x,ads_enabled:e.target.checked}:x))}/> Exibe anúncios</label><button onClick={()=>savePlan(plan)} disabled={saving===plan.id} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2 text-sm font-bold disabled:opacity-50">{saving===plan.id?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Salvar plano</button></article>)}</div></section>
  :tab==='settings'?<section className="max-w-xl"><h2 className="mb-4 text-xl font-bold">Taxas e regras persistentes</h2><div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4"><label className="block text-sm">Taxa da plataforma em assinaturas/PPV (%)<input type="number" min="0" max="100" step=".01" value={settings.platform_fee_percent} onChange={e=>setSettings({...settings,platform_fee_percent:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></label><label className="block text-sm">Taxa da plataforma em gorjetas (%)<input type="number" min="0" max="100" step=".01" value={settings.tips_fee_percent} onChange={e=>setSettings({...settings,tips_fee_percent:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></label><label className="block text-sm">Política de conteúdo gratuito<select value={settings.free_content_policy} onChange={e=>setSettings({...settings,free_content_policy:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"><option value="sensual_only">Somente sensual</option><option value="short_vertical_only">Somente vídeos curtos verticais</option></select></label><button onClick={saveSettings} disabled={saving==='settings'} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold">{saving==='settings'?'Salvando...':'Salvar regras'}</button></div></section>
  :tab==='catalog'?<section><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Categorias ({categories.length}) e tags ({tags.length})</h2><p className="mt-1 text-xs text-zinc-500">Crie, renomeie, ative/desative ou exclua itens do catálogo.</p></div><div className="flex gap-2"><select value={catalogDraft.kind} onChange={e=>setCatalogDraft({...catalogDraft,kind:e.target.value as any})} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"><option value="category">Categoria</option><option value="tag">Tag</option></select><input value={catalogDraft.name} onChange={e=>setCatalogDraft({...catalogDraft,name:e.target.value})} placeholder="Novo nome" className="min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/><button onClick={createCatalogItem} disabled={!catalogDraft.name.trim()||saving==='catalog'} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold disabled:opacity-40">Adicionar</button></div></div><div className="grid gap-4 md:grid-cols-2">{([['category',categories],['tag',tags]] as const).map(([kind,items])=><div key={kind} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4"><h3 className="mb-3 font-bold">{kind==='category'?'Categorias':'Tags'}</h3><div className="space-y-2">{items.map((x:any)=><div key={x.id} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2"><input defaultValue={x.name} onBlur={e=>{const name=e.target.value.trim();if(name&&name!==x.name)updateCatalogItem(kind,x,{name});}} className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-rose-500 rounded-lg"/><button onClick={()=>updateCatalogItem(kind,x,{is_active:!x.is_active})} className={`rounded-lg px-2 py-1 text-[10px] font-bold ${x.is_active?'bg-emerald-500/15 text-emerald-300':'bg-zinc-800 text-zinc-400'}`}>{x.is_active?'Ativo':'Inativo'}</button><button onClick={()=>deleteCatalogItem(kind,x)} className="rounded-lg px-2 py-1 text-xs text-rose-400 hover:bg-rose-950/40">Excluir</button></div>)}</div></div>)}</div></section>
  :tab==='moderation'?<section><h2 className="mb-4 text-xl font-bold">Fila central de moderação</h2><div className="space-y-3">{moderation.map(item=><article key={item.kind+item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div className="flex items-center gap-2 text-xs text-amber-300">{item.kind==='video'?<Play className="h-4 w-4"/>:item.kind==='comment'?<MessageSquare className="h-4 w-4"/>:<Megaphone className="h-4 w-4"/>}<span>{item.kind.toUpperCase()} • {item.status}</span></div><p className="mt-2 font-bold">{item.title}</p><p className="mt-1 max-w-3xl truncate text-sm text-zinc-400">{item.detail}</p><div className="mt-3 flex gap-2"><button onClick={()=>moderate(item,true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold">Aprovar</button><button onClick={()=>moderate(item,false)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold">Remover</button>{item.kind==='video'&&onSelectVideo&&<button onClick={()=>onSelectVideo(item.id)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold">Abrir</button>}</div></article>)}{reports.map(report=><article key={report.id} className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4"><p className="font-bold">Denúncia: {report.reason}</p><p className="mt-1 text-sm text-zinc-400">{report.description||'Sem descrição'}</p><div className="mt-3 flex gap-2"><button onClick={()=>openReportCase(report)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold">Encaminhar para punições</button><button onClick={()=>dismissReport(report)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold">Arquivar</button></div></article>)}{moderation.length===0&&reports.length===0&&<Empty text="Nenhuma pendência na fila."/>}</div></section>
  :tab==='creators'?<section><h2 className="mb-4 text-xl font-bold">Aprovação e verificação de criadores</h2><div className="space-y-3">{creatorRows.map(c=><article key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div><p className="font-bold">{c.display_name}</p><p className="text-xs text-zinc-500">Identidade: {c.identity_status||'pending'}{c.identity_provider?' via '+c.identity_provider:''} • Direitos: {c.content_rights_confirmed?'confirmados':'pendentes'} • {c.is_approved?'Aprovado':'Pendente'}</p></div><div className="flex gap-2"><button disabled={!c.is_approved&&(c.identity_status!=='verified'||c.content_rights_confirmed!==true)} onClick={()=>updateCreator(c,{is_approved:!c.is_approved})} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">{c.is_approved?'Reprovar':'Aprovar'}</button><button onClick={()=>updateCreator(c,{verified:!c.verified})} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold">{c.verified?'Remover selo':'Dar selo'}</button></div></article>)}{creatorRows.length===0&&<Empty text="Nenhum criador encontrado."/>}</div></section>
  :<section><h2 className="mb-4 text-xl font-bold">Campanhas de anúncios</h2>
  <form onSubmit={saveCampaign} className="mb-5 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-xs text-zinc-400">Nome da campanha<input required placeholder="Ex.: Lançamento setembro" value={newCampaign.name} onChange={e=>setNewCampaign({...newCampaign,name:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white"/></label>
      <label className="text-xs text-zinc-400">Anunciante<input required placeholder="Nome do anunciante" value={newCampaign.advertiser_name} onChange={e=>setNewCampaign({...newCampaign,advertiser_name:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white"/></label>
      <label className="text-xs text-zinc-400">Posicionamento<select value={newCampaign.placement} onChange={e=>setNewCampaign({...newCampaign,placement:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm"><option value="feed">Feed</option><option value="explore">Explorar</option><option value="stories">Stories</option><option value="videos">Vídeos</option></select></label>
      <label className="text-xs text-zinc-400">Orçamento (R$)<input type="number" min="0" step=".01" placeholder="0,00" value={newCampaign.budget} onChange={e=>setNewCampaign({...newCampaign,budget:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm"/></label>
      <label className="text-xs text-zinc-400">Início<input type="datetime-local" value={newCampaign.start_at} onChange={e=>setNewCampaign({...newCampaign,start_at:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm"/></label>
      <label className="text-xs text-zinc-400">Fim<input type="datetime-local" value={newCampaign.end_at} onChange={e=>setNewCampaign({...newCampaign,end_at:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm"/></label>
      <label className="text-xs text-zinc-400">Segmentação<select value={newCampaign.audience} onChange={e=>setNewCampaign({...newCampaign,audience:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm"><option value="all">Todos os usuários elegíveis</option><option value="free">Plano gratuito</option><option value="subscribers">Assinantes</option><option value="creators">Criadores</option></select></label>
      <label className="text-xs text-zinc-400">Estado inicial<select value={newCampaign.status} onChange={e=>setNewCampaign({...newCampaign,status:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm"><option value="draft">Rascunho</option><option value="active">Ativa</option><option value="paused">Pausada</option></select></label>
      <label className="text-xs text-zinc-400 md:col-span-2">URL/arquivo da prévia do anúncio<input placeholder="https://..." value={newCampaign.creative_url} onChange={e=>setNewCampaign({...newCampaign,creative_url:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm"/></label>
    </div>
    {newCampaign.creative_url && <div className="mt-3 rounded-2xl border border-zinc-800 bg-black/30 p-3"><p className="mb-2 text-xs font-bold text-zinc-400">Prévia</p><div className="truncate text-xs text-zinc-300">{newCampaign.creative_url}</div></div>}
    <button disabled={saving==='campaign'} className="mt-4 w-full rounded-xl bg-rose-600 px-3 py-3 text-sm font-bold hover:bg-rose-500">{saving==='campaign'?'Criando...':'Criar campanha'}</button>
  </form>
  <div className="space-y-3">{campaigns.map(c=><article key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div><p className="font-bold">{c.name}</p><p className="text-xs text-zinc-500">{c.advertiser_name} • {c.placement} • {c.status||'draft'} • {c.impressions||0} impressões • {c.clicks||0} cliques • R$ {Number(c.budget||0).toFixed(2).replace('.',',')}</p></div><button onClick={()=>toggleCampaign(c)} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold">{c.status==='active'?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{c.status==='active'?'Pausar':'Ativar'}</button></article>)}</div>{campaigns.length===0&&<Empty text="Nenhuma campanha cadastrada."/>}</section>

  return <div className="min-h-screen bg-[#09090b] px-4 pb-24 pt-24 text-white"><div className="mx-auto max-w-6xl"><div className="mb-5 flex items-start justify-between md:mb-8"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Controle operacional</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Centro do Administrador</h1><p className="mt-2 text-zinc-400">Gestão persistente de planos, taxas, catálogo, criadores, anúncios, pagamentos e segurança.</p></div><button type="button" onClick={()=>setTab('settings')} aria-label="Abrir configurações administrativas" title="Configurações administrativas" className="relative z-20 touch-manipulation rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition hover:border-rose-500 hover:text-rose-400 active:scale-95"><Settings className="h-6 w-6"/></button></div>{message&&<div role="status" className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{message}</div>}<div className="mb-4 md:hidden"><label className="mb-1 block text-xs font-bold text-zinc-400">Seção administrativa</label><select value={tab} onChange={e=>setTab(e.target.value as typeof tab)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm font-bold text-white">{nav.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div><div className="mb-6 hidden gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2 md:grid md:grid-cols-4 lg:grid-cols-9">{nav.map(([id,label,icon])=><button key={id} onClick={()=>setTab(id)} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-bold ${tab===id?'bg-rose-600 text-white':'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>{icon}{label}</button>)}</div>{loading?<div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-rose-400"/></div>:panel}</div></div>;
};

const Empty:React.FC<{text:string}>=({text})=><div className="rounded-3xl border border-dashed border-zinc-700 p-12 text-center text-sm text-zinc-500">{text}</div>;
