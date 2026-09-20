import React, { useState } from 'react';
import { ArrowLeft, CalendarClock, Radio, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export const LiveStudio: React.FC<{ onBack: () => void; onOpenLives: () => void }> = ({ onBack, onOpenLives }) => {
  const { currentCreator } = useAuth();
  const [title,setTitle]=useState('');
  const [plan,setPlan]=useState<'free'|'plus'|'vip'>('free');
  const [tipsEnabled,setTipsEnabled]=useState(true);
  const [soloEnabled,setSoloEnabled]=useState(false);
  const [soloPrice,setSoloPrice]=useState('49.90');
  const [scheduledAt,setScheduledAt]=useState('');
  const [message,setMessage]=useState('');
  const create = async (status:'live'|'scheduled') => {
    if(!title.trim()){ setMessage('Dê um título para a live.'); return; }
    if(!isSupabaseConfigured || !supabase){ setMessage('Configure o Supabase para criar uma live real.'); return; }
    if(!currentCreator?.id || !currentCreator.is_approved){ setMessage('Entre como criador aprovado para abrir uma live.'); return; }
    if(status==='live'){ setMessage('A transmissão ainda não está conectada. Você pode agendar a sessão.'); return; }
    if(status==='scheduled' && (!scheduledAt || !Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt)<=Date.now())){ setMessage('Escolha uma data e um horário futuros.'); return; }
    const { error } = await supabase.from('live_sessions').insert({ creator_id: currentCreator.id, title:title.trim(), status, required_plan:plan, tips_enabled:tipsEnabled, solo_enabled:soloEnabled, solo_price:soloEnabled?Number(soloPrice||0):0, scheduled_at: status==='scheduled' ? new Date(scheduledAt).toISOString() : new Date().toISOString() });
    if(error){ setMessage(error.message); return; }
    setMessage('Live agendada com sucesso.');
    setTimeout(onOpenLives,700);
  };
  return <div className="min-h-screen bg-[#09090b] px-4 pb-28 pt-24 text-white"><div className="mx-auto max-w-2xl">
    <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4"/> Voltar</button>
    <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-400">Velvet Creator Studio</p><h1 className="mt-2 text-3xl font-black">Agendar uma live</h1><p className="mt-2 text-sm text-zinc-400">Organize a próxima sessão enquanto a infraestrutura de transmissão é conectada.</p>
    <div className="mt-7 space-y-4 rounded-3xl border border-zinc-800 bg-[#121216] p-5">
      <label className="block text-sm font-semibold">Título<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Bastidores ao vivo" className="mt-2 w-full rounded-xl border border-zinc-700 bg-black/30 p-3 outline-none focus:border-rose-500"/></label>
      <label className="block text-sm font-semibold">Acesso<select value={plan} onChange={e=>setPlan(e.target.value as 'free'|'plus'|'vip')} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"><option value="free">Aberta e gratuita</option><option value="plus">Plus ou VIP</option><option value="vip">Somente VIP</option></select></label>
      <label className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm"><span>Permitir gorjetas durante a live</span><input type="checkbox" checked={tipsEnabled} onChange={e=>setTipsEnabled(e.target.checked)}/></label>
      <label className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm"><span>Permitir Live Solo (1:1 paga)</span><input type="checkbox" checked={soloEnabled} onChange={e=>setSoloEnabled(e.target.checked)}/></label>
      {soloEnabled&&<label className="block text-sm font-semibold">Preço da Live Solo (R$)<input type="number" min="1" step=".01" value={soloPrice} onChange={e=>setSoloPrice(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"/></label>}
      <label className="block text-sm font-semibold">Agendar (opcional)<input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"/></label>
      {message && <p role="status" className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-300">{message}</p>}
      <div className="grid gap-3 sm:grid-cols-2"><button disabled title="Disponível depois da integração com o provedor de streaming" className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-zinc-800 p-3 font-bold text-zinc-500"><Radio className="h-4 w-4"/> Transmissão indisponível</button><button onClick={()=>create('scheduled')} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 p-3 font-bold hover:border-rose-500"><CalendarClock className="h-4 w-4"/> Agendar live</button></div>
    </div>
    <div className="mt-4 flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 text-sm text-zinc-400"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400"/><p>Disponível apenas para criadores aprovados. A transmissão real ainda depende do provedor de streaming; esta tela cria e gerencia a sessão no Velvet VIP.</p></div>
  </div></div>;
};
