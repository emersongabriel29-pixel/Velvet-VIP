import React, { useState } from 'react';
import { ArrowLeft, CalendarClock, Radio, ShieldCheck, Copy, Loader2, CheckCircle2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type Ingest={rtmps_url:string;stream_key:string;srt?:{url?:string;passphrase?:string;streamId?:string}|null};

export const LiveStudio: React.FC<{ onBack: () => void; onOpenLives: () => void }> = ({ onBack, onOpenLives }) => {
  const { currentCreator } = useAuth();
  const [title,setTitle]=useState('');
  const [plan,setPlan]=useState<'plus'|'vip'>('plus');
  const [scheduledAt,setScheduledAt]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);
  const [liveId,setLiveId]=useState('');
  const [ingest,setIngest]=useState<Ingest|null>(null);
  const [connected,setConnected]=useState(false);

  const create = async () => {
    if(!title.trim()){ setMessage('Dê um título para a live.'); return; }
    if(!isSupabaseConfigured || !supabase){ setMessage('Backend de produção indisponível.'); return; }
    if(!currentCreator?.id){ setMessage('Entre como criador aprovado para abrir uma live.'); return; }
    setLoading(true);setMessage('');
    try{
      const {data,error}=await supabase.functions.invoke('create-live-input',{body:{
        title:title.trim(),required_plan:plan,scheduled_at:scheduledAt?new Date(scheduledAt).toISOString():new Date().toISOString()
      }});
      if(error||!data?.live_id||!data?.ingest) throw new Error(data?.error||error?.message||'Não foi possível criar a entrada de live.');
      setLiveId(data.live_id);setIngest(data.ingest);setConnected(false);
      setMessage('Entrada criada. Configure o OBS/encoder e, depois que iniciar o envio, toque em Verificar transmissão.');
    }catch(err:any){setMessage(err?.message||'Falha ao criar live.');}finally{setLoading(false);}
  };

  const verify = async () => {
    if(!liveId||!supabase)return;
    setLoading(true);setMessage('');
    try{
      const {data,error}=await supabase.functions.invoke('sync-live-input',{body:{live_id:liveId}});
      if(error)throw error;
      setConnected(Boolean(data?.live));
      setMessage(data?.live?'Transmissão conectada e marcada AO VIVO.':'O provedor ainda não está recebendo vídeo. Inicie o OBS/encoder e tente novamente.');
    }catch(err:any){setMessage(err?.message||'Não foi possível verificar a transmissão.');}finally{setLoading(false);}
  };
  const copy=async(value:string)=>{try{await navigator.clipboard.writeText(value);setMessage('Copiado com segurança. Não compartilhe a chave de transmissão.');}catch{}};

  return <div className="min-h-screen bg-[#09090b] px-4 pb-28 pt-24 text-white"><div className="mx-auto max-w-2xl">
    <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4"/> Voltar</button>
    <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-400">Velvet Creator Studio</p><h1 className="mt-2 text-3xl font-black">Transmissão ao vivo</h1><p className="mt-2 text-sm text-zinc-400">A live só entra como AO VIVO depois que o provedor confirmar que está recebendo o sinal.</p>
    <div className="mt-7 space-y-4 rounded-3xl border border-zinc-800 bg-[#121216] p-5">
      {!ingest ? <>
        <label className="block text-sm font-semibold">Título<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Bastidores ao vivo" className="mt-2 w-full rounded-xl border border-zinc-700 bg-black/30 p-3 outline-none focus:border-rose-500"/></label>
        <label className="block text-sm font-semibold">Acesso<select value={plan} onChange={e=>setPlan(e.target.value as 'plus'|'vip')} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"><option value="plus">Plus ou VIP</option><option value="vip">Somente VIP</option></select></label>
        <label className="block text-sm font-semibold">Agendar (opcional)<input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"/></label>
        <button disabled={loading} onClick={create} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 p-3 font-bold hover:bg-rose-500 disabled:opacity-50">{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<CalendarClock className="h-4 w-4"/>} Criar entrada segura de transmissão</button>
      </> : <>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Credenciais privadas do encoder</p><p className="mt-1 text-xs text-zinc-400">Use no OBS ou encoder. A chave não é salva no banco do Velvet e não deve ser compartilhada.</p></div>
        <div><p className="mb-1 text-xs text-zinc-400">Servidor RTMPS</p><div className="flex gap-2"><code className="min-w-0 flex-1 overflow-hidden text-ellipsis rounded-xl bg-black/40 p-3 text-xs">{ingest.rtmps_url}</code><button onClick={()=>copy(ingest.rtmps_url)} className="rounded-xl border border-zinc-700 p-3"><Copy className="h-4 w-4"/></button></div></div>
        <div><p className="mb-1 text-xs text-zinc-400">Chave de transmissão</p><div className="flex gap-2"><code className="min-w-0 flex-1 overflow-hidden text-ellipsis rounded-xl bg-black/40 p-3 text-xs">••••••••••••••••</code><button onClick={()=>copy(ingest.stream_key)} className="rounded-xl border border-zinc-700 p-3"><Copy className="h-4 w-4"/></button></div></div>
        <button disabled={loading} onClick={verify} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 p-3 font-bold hover:bg-emerald-500 disabled:opacity-50">{loading?<Loader2 className="h-4 w-4 animate-spin"/>:connected?<CheckCircle2 className="h-4 w-4"/>:<Radio className="h-4 w-4"/>} Verificar transmissão</button>
        {connected&&<button onClick={onOpenLives} className="w-full rounded-xl border border-zinc-700 p-3 font-bold">Abrir página da live</button>}
      </>}
      {message && <p role="status" className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-300">{message}</p>}
    </div>
    <div className="mt-4 flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 text-sm text-zinc-400"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400"/><p>Somente criadores aprovados, com identidade verificada e direitos de conteúdo confirmados, recebem credenciais de ingestão.</p></div>
  </div></div>;
};