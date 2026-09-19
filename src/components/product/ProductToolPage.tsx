import React,{useEffect,useState} from 'react';
import {ArrowLeft,Search,RefreshCw} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../hooks/useAuth';
import type {ProductTool} from './ProductHub';
const labels:Record<string,string>={search:'Buscar',saved:'Salvos',continue:'Continuar assistindo',live_schedule:'Agenda de lives',messages:'Mensagens',wishlist:'Lista de desejos PPV',bundles:'Pacotes de conteúdo',coupons:'Cupons promocionais',premieres:'Estreias',support:'Central de suporte',goals:'Metas do criador',clips:'Clipes de lives',operations:'Diagnóstico operacional'};
const tables:Record<string,[string,string]>={saved:['saved_videos','*,videos(title)'],continue:['watch_progress','*,videos(title)'],live_schedule:['live_sessions','*'],messages:['direct_messages','*'],wishlist:['ppv_wishlist','*,videos(title)'],bundles:['content_bundles','*'],coupons:['coupons','*'],premieres:['premieres','*,videos(title)'],support:['support_tickets','*'],goals:['creator_goals','*'],clips:['live_clips','*']};
export const ProductToolPage:React.FC<{tool:ProductTool;onBack:()=>void;onSelectVideo?:(id:string)=>void;onSelectCreator?:(id:string)=>void}>=({tool,onBack,onSelectVideo,onSelectCreator})=>{
 const {currentUser}=useAuth();const [q,setQ]=useState('');const [rows,setRows]=useState<any[]>([]);
 const [message,setMessage]=useState('');const [loading,setLoading]=useState(false);
 const load=async()=>{
  if(!supabase){setMessage('Conexão indisponível.');return;}
  setLoading(true);setMessage('');setRows([]);
  try{
   if(tool==='operations'){
    if(currentUser.role!=='admin')throw Error('Área exclusiva da administração.');
    const {data,error}=await supabase.rpc('get_operation_diagnostics');if(error)throw error;
    setRows((data?.checks||[]).map((r:any)=>({...r,_title:r.name,_type:'Acompanhamento',status:r.count>0?'Requer atenção':'Nenhuma pendência detectada'})));return;
   }
   if(tool==='search'){
    const term=q.trim().slice(0,100);if(!term)return;
    // Separate queries avoid interpolating user input into PostgREST OR grammar.
    const escaped=term.replace(/[\\%_]/g,'\\$&');
    const [videos,creators]=await Promise.all([
     supabase.from('videos').select('id,title,description').ilike('title',`%${escaped}%`).eq('is_removed',false).eq('is_draft',false).eq('moderation_status','approved').limit(30),
     supabase.from('creators').select('id,display_name').ilike('display_name',`%${escaped}%`).eq('is_approved',true).limit(20)
    ]);
    if(videos.error||creators.error)throw videos.error||creators.error;
    setRows([...(creators.data||[]).map(c=>({...c,_type:'Criador',_title:c.display_name})),...(videos.data||[]).map(v=>({...v,_type:'Vídeo',_title:v.title}))]);return;
   }
   const entry=tables[tool];if(!entry)return;
   const {data,error}=await supabase.from(entry[0]).select(entry[1]).order('created_at',{ascending:false}).limit(50);
   if(error)throw error;setRows(data||[]);
  }catch {setMessage('Não foi possível carregar os dados. Verifique sua sessão e tente novamente.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[tool,currentUser.id]);
 const open=(row:any)=>{if(row._type==='Criador')onSelectCreator?.(row.id);else if(row._type==='Vídeo'||row.video_id)onSelectVideo?.(row.video_id||row.id);};
 return <section className="mx-auto max-w-4xl px-4 pb-28 pt-20">
  <button onClick={onBack} className="text-sm text-zinc-400"><ArrowLeft className="mr-1 inline h-4 w-4"/>Voltar</button>
  <div className="mt-4 flex items-center justify-between"><h1 className="text-2xl font-black">{labels[tool]}</h1><button aria-label="Atualizar" disabled={loading} onClick={load}><RefreshCw className="h-5 w-5"/></button></div>
  {tool==='operations'&&<p className="mt-3 text-sm text-zinc-400">Filas e registros do banco. Este diagnóstico não certifica o funcionamento dos provedores externos.</p>}
  {tool==='search'&&<form onSubmit={e=>{e.preventDefault();void load();}} className="mt-4 flex gap-2"><input aria-label="Buscar" value={q} onChange={e=>setQ(e.target.value)} placeholder="Título do vídeo ou nome do criador" className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"/><button aria-label="Pesquisar" disabled={loading} className="rounded-xl bg-rose-600 px-4"><Search/></button></form>}
  {message&&<p role="alert" className="mt-4 text-sm text-rose-400">{message}</p>}
  {loading&&<p role="status" className="mt-4">Carregando…</p>}
  <div className="mt-5 space-y-2">{rows.map((r,i)=><article key={r.id||i} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div className="flex justify-between gap-3"><div><p className="text-xs text-rose-400">{r._type||r.status||'Item'}</p><h2 className="font-bold">{r._title||r.title||r.subject||r.code||r.videos?.title||'Registro'}</h2></div>{r.count!==undefined&&<strong>{r.count}</strong>}</div>{r.status&&<p className="mt-2 text-xs text-zinc-400">{r.status}</p>}{(r._type==='Criador'||r._type==='Vídeo'||r.video_id)&&<button onClick={()=>open(r)} className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-sm">Abrir</button>}</article>)}{!rows.length&&!loading&&!message&&<p className="p-8 text-center text-sm text-zinc-500">Nenhum item encontrado.</p>}</div>
 </section>;
};
