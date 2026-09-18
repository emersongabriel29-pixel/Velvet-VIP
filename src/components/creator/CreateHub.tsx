import React from 'react';
import { Clapperboard, Film, Radio, X } from 'lucide-react';

interface CreateHubProps {
  isOpen: boolean;
  onClose: () => void;
  onShortVideo: () => void;
  onLongVideo: () => void;
  onLive: () => void;
}

export const CreateHub: React.FC<CreateHubProps> = ({ isOpen, onClose, onShortVideo, onLongVideo, onLive }) => {
  if (!isOpen) return null;
  const action = (fn: () => void) => { onClose(); fn(); };
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center">
    <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#121216] p-5 shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-rose-400">Criar</p><h2 className="text-xl font-black">O que você quer publicar?</h2></div><button onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5"/></button></div>
      <div className="grid gap-3">
        <button onClick={() => action(onShortVideo)} className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-left hover:border-rose-500/60"><span className="rounded-xl bg-rose-500/15 p-3 text-rose-400"><Clapperboard/></span><span><b className="block">Vídeo curto</b><small className="text-zinc-400">Vertical 9:16 para o feed</small></span></button>
        <button onClick={() => action(onLongVideo)} className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-left hover:border-amber-500/60"><span className="rounded-xl bg-amber-500/15 p-3 text-amber-400"><Film/></span><span><b className="block">Vídeo longo</b><small className="text-zinc-400">Conteúdo completo para o perfil do criador</small></span></button>
        <button onClick={() => action(onLive)} className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-left hover:border-emerald-500/60"><span className="rounded-xl bg-emerald-500/15 p-3 text-emerald-400"><Radio/></span><span><b className="block">Abrir uma live</b><small className="text-zinc-400">Inicie agora ou agende uma transmissão</small></span></button>
      </div>
    </section>
  </div>;
};