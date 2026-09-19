import React, { useEffect, useState } from 'react';
import { Radio, Bell, MessageCircle, ShieldCheck, ArrowLeft, Loader2, Settings, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { AdaptiveVideo } from '../common/AdaptiveVideo';

type Live={id:string;creator_id:string;title:string;creator_name?:string;status:'live'|'scheduled';scheduled_at?:string;required_plan:'free'|'plus'|'vip';tips_enabled?:boolean;solo_enabled?:boolean;solo_price?:number;streaming_provider?:string;available_qualities?:string[]};
type LiveSource={label:string;url:string;type:string};
type PlayerState={live:Live;sources:LiveSource[];selected:LiveSource};

export const LivePage:React.FC<{onBack:()=>void}>=({onBack})=>{
  const [lives,setLives]=useState<Live[]>([]);
  const [reminded,setReminded]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [feedback,setFeedback]=useState('');
  const [joining,setJoining]=useState<string|null>(null);
  const [player,setPlayer]=useState<PlayerState|null>(null);
  const [qualityOpen,setQualityOpen]=useState(false);

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try{
        if(!isSupabaseConfigured||!supabase){if(mounted)setFeedback('Lives reais aparecerão após configurar o Supabase.');return;}
        const {data,error}=await supabase.from('live_sessions')
          .select('id,creator_id,title,status,scheduled_at,required_plan,tips_enabled,solo_enabled,solo_price,streaming_provider,available_qualities,creator:creators(display_name)')
          .in('status',['live','scheduled']).eq('moderation_status','approved').order('scheduled_at',{ascending:true});
        if(error)throw error;
        if(mounted)setLives((data||[]).map((item:any)=>({...item,creator_name:item.creator?.display_name})));
      }catch(error:any){if(mounted)setFeedback(error.message||'Não foi possível carregar as lives.');}
      finally{if(mounted)setLoading(false);}
    })();
    return()=>{mounted=false};
  },[]);

  const checkout=async(body:any)=>{if(!supabase)return;setFeedback('');try{const {data,error}=await supabase.functions.invoke('create-checkout',{body});if(error||!data?.checkoutUrl)throw new Error(data?.error||error?.message||'Não foi possível iniciar o pagamento.');window.location.href=data.checkoutUrl;}catch(e:any){setFeedback(e.message||'Não foi possível iniciar o pagamento.');}};
  const sendTip=async(live:Live)=>{const value=window.prompt('Valor da gorjeta (R$)', '10');const amount=Number(value);if(!Number.isFinite(amount)||amount<1)return;await checkout({kind:'tip',creatorId:live.creator_id,amount,message:'Gorjeta durante a live',liveId:live.id});};
  const buySolo=async(live:Live)=>{if(!live.solo_enabled||!live.solo_price)return; if(!window.confirm(`Solicitar Live Solo por R$ ${Number(live.solo_price).toFixed(2).replace('.',',')}?`))return;await checkout({kind:'live_solo',creatorId:live.creator_id,liveId:live.id,amount:Number(live.solo_price)});};
  const enterLive=async(live:Live)=>{
    if(!supabase)return;
    setJoining(live.id);setFeedback('');
    try{
      const {data,error}=await supabase.functions.invoke('get-live-playback',{body:{live_id:live.id}});
      if(error||!data?.sources?.length)throw new Error(data?.error||error?.message||'Transmissão ainda não disponível.');
      const sources=data.sources as LiveSource[];
      setPlayer({live,sources,selected:sources[0]});
    }catch(error:any){
      const raw=String(error?.message||'');
      setFeedback(raw.includes('Required platform plan')?'Esta live exige o plano indicado para acesso.':raw.includes('18+')?'Confirme sua maioridade antes de acessar a live.':raw.includes('provider')||raw.includes('source')?'A sala existe, mas o provedor de transmissão ainda não liberou o vídeo.':raw||'Não foi possível entrar na live.');
    }finally{setJoining(null);}
  };

  const toggle=(id:string)=>setReminded(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
  const formatDate=(value?:string)=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Horário a confirmar';

  return <div className="min-h-screen bg-[#09090b] px-4 pb-28 pt-24 text-white"><div className="mx-auto max-w-5xl">
    <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4"/> Voltar</button>
    <div className="mb-8 flex items-center justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Comunidade Velvet</p><h1 className="text-3xl font-black">Lives</h1><p className="mt-2 text-zinc-400">Lives abertas, exclusivas para planos e experiências Live Solo.</p></div><div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><Radio className="mr-1 inline h-3 w-3"/> {lives.filter(x=>x.status==='live').length} ao vivo</div></div>
    {feedback&&<div role="status" className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{feedback}</div>}
    {loading?<div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-rose-400"/></div>:lives.length===0?<div className="rounded-3xl border border-dashed border-zinc-700 p-12 text-center text-zinc-500">Nenhuma live publicada no momento.</div>:<div className="grid gap-5 md:grid-cols-3">{lives.map(live=><article key={live.id} className="overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-rose-950 to-zinc-950"><div className="flex h-44 items-end justify-between p-4"><span className={`rounded-lg px-2 py-1 text-[10px] font-black ${live.status==='live'?'bg-rose-600':'bg-zinc-950/70'}`}>{live.status==='live'?'AO VIVO':'AGENDADA'}</span><span className="rounded-lg bg-black/40 px-2 py-1 text-[10px]">{live.required_plan==="free"?"GRÁTIS":live.required_plan.toUpperCase()}</span></div><div className="bg-black/30 p-4"><h2 className="font-bold">{live.title}</h2><p className="mt-1 text-sm text-zinc-300">{live.creator_name||'Criador verificado'}</p><p className="mt-2 text-xs font-semibold text-amber-300">{live.required_plan==="free"?"Acesso aberto e gratuito":live.required_plan==="vip"?"Somente VIP":"Plus ou VIP"}</p>{live.status==='live'?<div className="mt-4 space-y-2"><button onClick={()=>enterLive(live)} disabled={joining===live.id} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold hover:bg-rose-500 disabled:opacity-50">{joining===live.id?<Loader2 className="h-4 w-4 animate-spin"/>:<Radio className="h-4 w-4"/>} Entrar na live</button>{live.tips_enabled&&<button onClick={()=>sendTip(live)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm font-bold text-amber-300">💰 Enviar gorjeta</button>}{live.solo_enabled&&<button onClick={()=>buySolo(live)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 py-2.5 text-sm font-bold text-violet-300">🔒 Live Solo • R$ {Number(live.solo_price||0).toFixed(2).replace('.',',')}</button></div>:<button onClick={()=>toggle(live.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-2.5 text-sm font-bold hover:border-rose-500"><Bell className="h-4 w-4"/> {reminded.includes(live.id)?'Lembrete ativado':formatDate(live.scheduled_at)}</button>}</div></article>)}</div>}
    <div className="mt-8 grid gap-5 md:grid-cols-2"><div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><MessageCircle className="h-5 w-5 text-rose-400"/> Chat moderado</h2><p className="mt-2 text-sm text-zinc-400">Mensagens, denúncias e bloqueios são tratados pelas regras de moderação da plataforma.</p></div><div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-400"/> Segurança</h2><p className="mt-2 text-sm text-zinc-400">A reprodução só é liberada após validar sessão, 18+, plano e fonte aprovada pelo servidor.</p></div></div>
  </div>

  {player&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm"><div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-800 bg-[#111116]"><div className="flex items-center justify-between border-b border-zinc-800 p-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-rose-400">AO VIVO</p><h2 className="font-bold">{player.live.title}</h2></div><div className="flex items-center gap-2">{player.sources.length>1&&<div className="relative"><button onClick={()=>setQualityOpen(v=>!v)} className="rounded-xl border border-zinc-700 p-2" title="Qualidade"><Settings className="h-4 w-4"/></button>{qualityOpen&&<div className="absolute right-0 top-11 z-20 w-36 rounded-xl border border-zinc-700 bg-black p-1">{player.sources.map(src=><button key={src.label+src.url} onClick={()=>{setPlayer({...player,selected:src});setQualityOpen(false)}} className={`block w-full rounded-lg px-3 py-2 text-left text-xs ${player.selected.url===src.url?'bg-rose-600':'hover:bg-zinc-800'}`}>{src.label}</button>)}</div>}</div>}<button onClick={()=>{setPlayer(null);setQualityOpen(false)}} className="rounded-xl border border-zinc-700 p-2"><X className="h-4 w-4"/></button></div></div><AdaptiveVideo key={player.selected.url} sourceUrl={player.selected.url} sourceType={player.selected.type} controls autoPlay playsInline className="aspect-video w-full bg-black object-contain" onPlaybackError={(message)=>setFeedback(message)}/><div className="p-3 text-xs text-zinc-500">Qualidade: {player.selected.label}. As opções exibidas vêm do provedor real de streaming.</div></div></div>}
  </div>;
};
