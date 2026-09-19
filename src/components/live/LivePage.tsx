import React, { useEffect, useState } from 'react';
import { Radio, Bell, MessageCircle, ShieldCheck, ArrowLeft, Loader2, Settings } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

type Live = { id: string; title: string; creator_name?: string; status: 'live' | 'scheduled'; scheduled_at?: string; required_plan: 'plus' | 'vip' };

export const LivePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [lives, setLives] = useState<Live[]>([]);
  const [reminded, setReminded] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [quality,setQuality]=useState('auto');
  const [qualityOpen,setQualityOpen]=useState<string|null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!isSupabaseConfigured || !supabase) {
          if (mounted) setFeedback('Lives reais aparecerão após configurar o Supabase. Nenhuma live demonstrativa é exibida.');
          return;
        }
        const { data, error } = await supabase.from('live_sessions').select('id,title,status,scheduled_at,required_plan,creator:creators(display_name)').in('status', ['live', 'scheduled']).order('scheduled_at', { ascending: true });
        if (error) throw error;
        if (mounted) setLives((data || []).map((item: any) => ({ ...item, creator_name: item.creator?.display_name })));
      } catch (error: any) {
        if (mounted) setFeedback(error.message || 'Não foi possível carregar as lives.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggle = (id: string) => setReminded(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id]);
  const formatDate = (value?: string) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Horário a confirmar';

  return <div className="min-h-screen bg-[#09090b] px-4 pb-28 pt-24 text-white"><div className="mx-auto max-w-5xl">
    <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</button>
    <div className="mb-8 flex items-center justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Comunidade Velvet</p><h1 className="text-3xl font-black">Lives pagas</h1><p className="mt-2 text-zinc-400">Todas as lives exigem Plus ou VIP; lives exclusivas exigem VIP.</p></div><div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><Radio className="mr-1 inline h-3 w-3" /> {lives.filter(live => live.status === 'live').length} ao vivo</div></div>
    {feedback && <div role="status" className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{feedback}</div>}
    {loading ? <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-rose-400" /></div> : lives.length === 0 ? <div className="rounded-3xl border border-dashed border-zinc-700 p-12 text-center text-zinc-500">Nenhuma live publicada no momento.</div> : <div className="grid gap-5 md:grid-cols-3">{lives.map(live => <article key={live.id} className="overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-rose-950 to-zinc-950"><div className="flex h-44 items-end justify-between p-4"><span className={`rounded-lg px-2 py-1 text-[10px] font-black ${live.status === 'live' ? 'bg-rose-600' : 'bg-zinc-950/70'}`}>{live.status === 'live' ? 'AO VIVO' : 'AGENDADA'}</span><div className="flex items-center gap-2"><div className="relative"><button onClick={()=>setQualityOpen(qualityOpen===live.id?null:live.id)} className="rounded-lg bg-black/50 p-1.5" title="Qualidade da live"><Settings className="h-3.5 w-3.5"/></button>{qualityOpen===live.id&&<div className="absolute right-0 top-8 z-20 w-28 rounded-xl border border-white/10 bg-black/95 p-1">{['auto','360p','480p','720p','1080p','4K'].map(q=><button key={q} onClick={()=>{setQuality(q);setQualityOpen(null)}} className={`block w-full rounded-lg px-2 py-1.5 text-left text-[10px] ${quality===q?'bg-rose-600':'hover:bg-white/10'}`}>{q==='auto'?'Automático':q}</button>)}</div>}</div><span className="rounded-lg bg-black/40 px-2 py-1 text-[10px]">{live.required_plan.toUpperCase()}</span></div></div><div className="bg-black/30 p-4"><h2 className="font-bold">{live.title}</h2><p className="mt-1 text-sm text-zinc-300">{live.creator_name || 'Criador verificado'}</p><p className="mt-2 text-xs font-semibold text-amber-300">Acesso pago • {live.required_plan === 'vip' ? 'VIP' : 'Plus ou VIP'}</p>{live.status === 'live' ? <button className="mt-4 w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold hover:bg-rose-500">Assinar para entrar</button> : <button onClick={() => toggle(live.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-2.5 text-sm font-bold hover:border-rose-500"><Bell className="h-4 w-4" /> {reminded.includes(live.id) ? 'Lembrete ativado' : formatDate(live.scheduled_at)}</button>}</div></article>)}</div>}
    <div className="mt-8 grid gap-5 md:grid-cols-2"><div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><MessageCircle className="h-5 w-5 text-rose-400" /> Chat moderado</h2><p className="mt-2 text-sm text-zinc-400">Mensagens, denúncias e bloqueios devem ser processados pelo backend e pela equipe de moderação.</p></div><div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-400" /> Segurança</h2><p className="mt-2 text-sm text-zinc-400">Lives somente para criadores verificados, maiores de idade e com consentimento registrado.</p></div></div>
  </div></div>;
};
