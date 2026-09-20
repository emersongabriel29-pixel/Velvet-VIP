import React from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';
import type { AdCampaign } from '../../types';

const safeTarget=(value?:string)=>{try{const url=new URL(value||'');return ['http:','https:'].includes(url.protocol)?url.toString():'';}catch{return '';}};

export const AdBanner: React.FC<{ campaign: AdCampaign; compact?: boolean }> = ({ campaign, compact = false }) => {
  const target=safeTarget(campaign.target_url);
  const content=<>
    {campaign.creative_url&&<img src={campaign.creative_url} alt={`Anúncio de ${campaign.advertiser_name}`} className={`w-full rounded-xl object-cover ${compact?'mb-2 max-h-28':'mb-3 max-h-52'}`} referrerPolicy="no-referrer"/>}
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-rose-500/10 p-2"><Megaphone className="h-4 w-4 text-rose-400" /></div>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Publicidade • {campaign.advertiser_name}</p><p className="truncate text-sm font-semibold text-zinc-200">{campaign.name}</p></div>
      </div>
      {target&&<span className="flex shrink-0 items-center gap-1 text-xs text-rose-400">Saiba mais <ExternalLink className="h-3 w-3" /></span>}
    </div>
    {!compact && <p className="mt-3 text-xs text-zinc-500">Usuários Plus e VIP não visualizam anúncios.</p>}
  </>;
  return target?<a href={target} target="_blank" rel="noopener noreferrer sponsored" role="complementary" aria-label={`Publicidade: ${campaign.name}`} className={`my-4 block overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 transition hover:border-rose-500/40 ${compact?'p-3':'p-5'}`}>{content}</a>:<div role="complementary" aria-label={`Publicidade: ${campaign.name}`} className={`my-4 overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 ${compact?'p-3':'p-5'}`}>{content}</div>;
};
