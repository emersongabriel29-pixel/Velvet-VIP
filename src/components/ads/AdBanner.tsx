import React from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';

export const AdBanner: React.FC<{ title?: string; compact?: boolean }> = ({ title = 'Publicidade', compact = false }) => (
  <div role="complementary" aria-label="Publicidade" className={`my-4 overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 ${compact ? 'p-3' : 'p-5'}`}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-rose-500/10 p-2"><Megaphone className="h-4 w-4 text-rose-400" /></div>
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{title}</p><p className="text-sm font-semibold text-zinc-200">Espaço reservado para anunciantes</p></div>
      </div>
      <button className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300">Saiba mais <ExternalLink className="h-3 w-3" /></button>
    </div>
    {!compact && <p className="mt-3 text-xs text-zinc-500">Usuários Plus e VIP não visualizam anúncios.</p>}
  </div>
);