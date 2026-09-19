import React from 'react';
import { Radio, Lock, LogIn, Heart } from 'lucide-react';

export interface FeedLive {
  id:string; creator_id:string; title:string; creator_name?:string; creator_avatar?:string;
  required_plan:'free'|'plus'|'vip'; viewer_count?:number; tips_enabled?:boolean;
}

export const LiveFeedCard:React.FC<{live:FeedLive;onOpen:()=>void;isAuthenticated:boolean}>=({live,onOpen,isAuthenticated})=>{
 const access=live.required_plan==='free'?'GRÁTIS':live.required_plan==='vip'?'VIP':'PLUS + VIP';
 return <article className="relative flex h-[88vh] w-full max-w-[420px] flex-col justify-end overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-b from-rose-950 via-zinc-950 to-black shadow-2xl">
   <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(244,63,94,.32),transparent_45%)]"/>
   <div className="relative z-10 p-6">
     <div className="mb-3 flex items-center justify-between">
       <span className="rounded-full bg-rose-600 px-3 py-1 text-[10px] font-black tracking-wider"><Radio className="mr-1 inline h-3 w-3"/> AO VIVO</span>
       <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold">{access}</span>
     </div>
     <h2 className="text-2xl font-black">{live.title}</h2>
     <p className="mt-2 text-sm text-zinc-300">🔴 {live.creator_name||'Criador'} está em live agora</p>
     <p className="mt-1 text-xs text-zinc-500">{live.viewer_count||0} assistindo{live.tips_enabled?' • Gorjetas liberadas':''}</p>
     <button onClick={onOpen} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-sm font-black hover:bg-rose-500">
       {isAuthenticated?<>{live.required_plan==='free'?<Radio className="h-4 w-4"/>:<Lock className="h-4 w-4"/>} Assistir live</>:<><LogIn className="h-4 w-4"/> Entrar para assistir</>}
     </button>
   </div>
 </article>;
};