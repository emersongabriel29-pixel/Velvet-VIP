import React, { useState } from 'react';
import { Radio, Bell, MessageCircle, ShieldCheck, ArrowLeft } from 'lucide-react';

export const LivePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [reminded, setReminded] = useState<string[]>([]);
  const lives = [
    { id: 'live-1', title: 'Noite Velvet — conversa exclusiva', creator: 'Sophia Luxe', viewers: '1,2 mil', status: 'AO VIVO', required: 'VIP', color: 'from-rose-900 to-purple-950' },
    { id: 'live-2', title: 'Bastidores e perguntas dos fãs', creator: 'Fernanda VIP', viewers: 'Hoje, 21:00', status: 'AGENDADA', required: 'Plus ou VIP', color: 'from-zinc-800 to-rose-950' },
    { id: 'live-3', title: 'Especial Clube VIP', creator: 'Valentina Rossi', viewers: 'Amanhã, 20:30', status: 'AGENDADA', required: 'VIP', color: 'from-amber-950 to-zinc-900' },
  ];
  const toggle = (id: string) => setReminded(x => x.includes(id) ? x.filter(v => v !== id) : [...x, id]);
  return <div className="min-h-screen bg-[#09090b] px-4 pb-28 pt-24 text-white"><div className="mx-auto max-w-5xl">
    <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4"/> Voltar</button>
    <div className="mb-8 flex items-center justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Comunidade Velvet</p><h1 className="text-3xl font-black">Lives</h1><p className="mt-2 text-zinc-400">Assista, interaja e acompanhe seus criadores favoritos.</p></div><div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><Radio className="mr-1 inline h-3 w-3"/> 1 ao vivo agora</div></div>
    <div className="grid gap-5 md:grid-cols-3">{lives.map(l => <article key={l.id} className={`overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br ${l.color}`}>
      <div className="flex h-44 items-end justify-between p-4"><span className={`rounded-lg px-2 py-1 text-[10px] font-black ${l.status === 'AO VIVO' ? 'bg-rose-600' : 'bg-zinc-950/70'}`}>{l.status}</span><span className="rounded-lg bg-black/40 px-2 py-1 text-[10px]">{l.viewers}</span></div>
      <div className="bg-black/30 p-4"><h2 className="font-bold">{l.title}</h2><p className="mt-1 text-sm text-zinc-300">{l.creator}</p><p className="mt-2 text-xs font-semibold text-amber-300">Acesso pago • {l.required}</p>{l.status === 'AO VIVO' ? <button className="mt-4 w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold hover:bg-rose-500">Assinar para entrar</button> : <button onClick={() => toggle(l.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-2.5 text-sm font-bold hover:border-rose-500"><Bell className="h-4 w-4"/> {reminded.includes(l.id) ? 'Lembrete ativado' : 'Lembrar-me'}</button>}</div>
    </article>)}</div>
    <div className="mt-8 grid gap-5 md:grid-cols-2"><div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><MessageCircle className="h-5 w-5 text-rose-400"/> Chat moderado</h2><p className="mt-2 text-sm text-zinc-400">Mensagens, denúncias e bloqueios em tempo real. Criadores podem fixar mensagens e moderadores podem remover usuários.</p></div><div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-400"/> Segurança</h2><p className="mt-2 text-sm text-zinc-400">Lives somente para criadores verificados, com confirmação de maioridade, consentimento e moderação ativa.</p></div></div>
  </div></div>;
};