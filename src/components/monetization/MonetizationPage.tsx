import React, { useState } from 'react';
import { Check, Gift, Crown, Megaphone, ArrowLeft } from 'lucide-react';

export const MonetizationPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selected, setSelected] = useState('plus');
  const plans = [
    { id: 'gratis', name: 'Grátis', price: 'R$ 0', tone: 'zinc', ads: true, items: ['Feed com anúncios', 'Acesso ao conteúdo gratuito', 'Favoritos limitados'] },
    { id: 'plus', name: 'Plus', price: 'R$ 19,90/mês', tone: 'rose', ads: false, items: ['Sem anúncios', 'Filtros avançados', 'Mais favoritos', 'Suporte prioritário'] },
    { id: 'vip', name: 'VIP', price: 'R$ 39,90/mês', tone: 'amber', ads: false, items: ['Sem anúncios', 'Acesso antecipado', 'Descontos exclusivos', 'Gorjetas destacadas'] },
  ];
  return <div className="min-h-screen bg-[#09090b] px-4 pb-28 pt-24 text-white">
    <div className="mx-auto max-w-5xl">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4"/> Voltar</button>
      <div className="mb-10 text-center"><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Velvet VIP</p><h1 className="text-3xl font-black sm:text-4xl">Escolha sua experiência</h1><p className="mt-3 text-zinc-400">Mais liberdade para descobrir criadores e conteúdos exclusivos.</p></div>
      <div className="grid gap-4 md:grid-cols-3">{plans.map(p => <button key={p.id} onClick={() => setSelected(p.id)} className={`text-left rounded-3xl border p-6 transition ${selected === p.id ? 'border-rose-500 bg-rose-950/20 ring-2 ring-rose-500/20' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'}`}>
        <div className="mb-5 flex items-center justify-between"><span className="text-lg font-bold">{p.name}</span>{p.id === 'vip' ? <Crown className="h-5 w-5 text-amber-400"/> : p.id === 'plus' ? <Gift className="h-5 w-5 text-rose-400"/> : <Megaphone className="h-5 w-5 text-zinc-400"/>}</div>
        <div className="mb-5 text-2xl font-black">{p.price}</div>
        <ul className="space-y-3 text-sm text-zinc-300">{p.items.map(i => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-400"/>{i}</li>)}</ul>
      </button>)}</div>
      <div className="mt-10 grid gap-5 md:grid-cols-2"><div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"><h2 className="mb-2 text-xl font-bold">Apoie um criador</h2><p className="mb-5 text-sm text-zinc-400">Envie uma gorjeta e deixe uma mensagem. O criador recebe 90% do valor.</p><div className="flex gap-2">{['R$ 5','R$ 10','R$ 20','Outro valor'].map(v => <button key={v} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs hover:border-rose-500">{v}</button>)}</div></div><div className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-6"><h2 className="mb-2 text-xl font-bold">Como os criadores ganham</h2><p className="text-sm text-zinc-400">Assinaturas e vendas: 85% para o criador. Gorjetas: 90% para o criador. Valores transparentes antes da confirmação.</p></div></div>
      {selected === 'gratis' && <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-5 text-center text-sm text-zinc-400"><Megaphone className="mx-auto mb-2 h-5 w-5 text-zinc-500"/>Prévia de anúncio exibido no plano gratuito</div>}
    </div>
  </div>;
};
