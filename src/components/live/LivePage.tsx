import React, { useEffect, useState } from 'react';
import { Radio, Bell, MessageCircle, ShieldCheck, ArrowLeft, Loader2, Settings, X, Heart, Share2, Send, DollarSign, Plus } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { AdaptiveVideo } from '../common/AdaptiveVideo';
import { useAuth } from '../../hooks/useAuth';

type Live = {
  id:string; creator_id:string; title:string; creator_name?:string;
  status:'live'|'scheduled'; scheduled_at?:string;
  required_plan:'free'|'plus'|'vip'; tips_enabled?:boolean;
  solo_enabled?:boolean; solo_price?:number;
};
type LiveSource={label:string;url:string;type:string};
type PlayerState={live:Live;sources:LiveSource[];selected:LiveSource};

export const LivePage:React.FC<{onBack:()=>void;initialLiveId?:string}>=({onBack,initialLiveId})=>{
  const {isAuthenticated,currentUser,currentCreator}=useAuth();
  const [lives,setLives]=useState<Live[]>([]);
  const [reminded,setReminded]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [feedback,setFeedback]=useState('');
  const [joining,setJoining]=useState<string|null>(null);
  const [player,setPlayer]=useState<PlayerState|null>(null);
  const [focusedLiveId,setFocusedLiveId]=useState<string|null>(null);
  const [qualityOpen,setQualityOpen]=useState(false);
  const [hasLiked,setHasLiked]=useState(false);
  const [likesCount,setLikesCount]=useState(0);
  const [comments,setComments]=useState<any[]>([]);
  const [comment,setComment]=useState('');
  const [offers,setOffers]=useState<any[]>([]);
  const [offerForm,setOfferForm]=useState({title:'',description:'',amount:'20',max_orders:'1'});
  const detectedLocale=(navigator.language||'pt-BR').toLowerCase().startsWith('en')?'en-US':'pt-BR';
  const detectedCurrency=detectedLocale==='en-US'?'USD':'BRL';
  const [regional,setRegional]=useState({currency:detectedCurrency,presets:[5,10,20,50,100],likes:true,comments:true,sharing:true,offers:true,watermark:true});

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try{
        if(!isSupabaseConfigured||!supabase){if(mounted)setFeedback('Lives reais aparecerão após configurar o Supabase.');return;}
        const {data,error}=await supabase.from('live_sessions')
          .select('id,creator_id,title,status,scheduled_at,required_plan,tips_enabled,solo_enabled,solo_price,creator:creators(display_name)')
          .in('status',['live','scheduled']).eq('moderation_status','approved').order('scheduled_at',{ascending:true});
        if(error)throw error;
        if(mounted)setLives((data||[]).map((item:any)=>({...item,creator_name:item.creator?.display_name})));
      }catch(error:any){if(mounted)setFeedback(error.message||'Não foi possível carregar as lives.');}
      finally{if(mounted)setLoading(false);}
    })();
    return()=>{mounted=false};
  },[]);

  useEffect(()=>{if(!supabase)return;supabase.from('app_content_settings').select('tip_presets,live_likes_enabled,live_comments_enabled,live_sharing_enabled,live_offers_enabled,live_watermark_enabled').eq('id','global').maybeSingle().then(({data})=>{const values=data?.tip_presets?.[detectedCurrency];setRegional({currency:detectedCurrency,presets:Array.isArray(values)?values.map(Number).filter(Number.isFinite):[5,10,20,50,100],likes:data?.live_likes_enabled!==false,comments:data?.live_comments_enabled!==false,sharing:data?.live_sharing_enabled!==false,offers:data?.live_offers_enabled!==false,watermark:data?.live_watermark_enabled!==false});});},[detectedCurrency]);

  const loadEngagement=async(liveId:string)=>{
    if(!supabase||!isAuthenticated)return;
    const [likeRows,commentRows,offerRows,liveRow]=await Promise.all([
      supabase.from('live_likes').select('id').eq('live_id',liveId).eq('user_id',currentUser.id).maybeSingle(),
      supabase.from('live_comments').select('id,content,created_at,user:profiles(name,avatar_url)').eq('live_id',liveId).eq('moderation_status','approved').order('created_at',{ascending:false}).limit(100),
      supabase.from('live_offers').select('id,title,description,amount,currency,status,max_orders,orders_count,creator_id').eq('live_id',liveId).in('status',['active','sold_out']).order('created_at',{ascending:false}),
      supabase.from('live_sessions').select('likes_count').eq('id',liveId).single(),
    ]);
    setHasLiked(Boolean(likeRows.data));setComments(commentRows.data||[]);setOffers(offerRows.data||[]);setLikesCount(Number(liveRow.data?.likes_count||0));
  };

  useEffect(()=>{if(player)void loadEngagement(player.live.id);},[player?.live.id,currentUser.id]);

  const checkout=async(body:any)=>{
    if(!supabase)return;
    setFeedback('');
    try{
      const {data,error}=await supabase.functions.invoke('create-checkout',{body});
      if(error||!data?.checkoutUrl)throw new Error(data?.error||error?.message||'Não foi possível iniciar o pagamento.');
      window.location.href=data.checkoutUrl;
    }catch(e:any){setFeedback(e.message||'Não foi possível iniciar o pagamento.');}
  };

  const sendTip=async(live:Live)=>{
    if(!isAuthenticated){setFeedback('Faça login para enviar uma gorjeta.');return;}
    const value=window.prompt('Valor da gorjeta (R$)','10');
    const amount=Number(value);
    if(!Number.isFinite(amount)||amount<1)return;
    await checkout({kind:'tip',creatorId:live.creator_id,amount,message:'Gorjeta durante a live',liveId:live.id});
  };
  const sendPresetTip=async(live:Live,amount:number)=>{
    if(!isAuthenticated){setFeedback('Faça login para enviar uma gorjeta.');return;}
    await checkout({kind:'tip',creatorId:live.creator_id,amount,currency:regional.currency,message:'Gorjeta durante a live',liveId:live.id});
  };

  const toggleLike=async()=>{if(!supabase||!player||!isAuthenticated)return;const previous=hasLiked;setHasLiked(!previous);setLikesCount(v=>Math.max(0,v+(previous?-1:1)));const {data,error}=await supabase.rpc('toggle_live_like',{p_live_id:player.live.id});if(error){setHasLiked(previous);setLikesCount(v=>Math.max(0,v+(previous?1:-1)));setFeedback(error.message);}else setHasLiked(Boolean(data));};
  const addComment=async()=>{if(!supabase||!player||!comment.trim())return;const {error}=await supabase.from('live_comments').insert({live_id:player.live.id,user_id:currentUser.id,content:comment.trim()});if(error){setFeedback(error.message);return;}setComment('');await loadEngagement(player.live.id);};
  const shareLive=async()=>{if(!supabase||!player)return;const url=`${window.location.origin}${window.location.pathname}#live=${player.live.id}`;try{if(navigator.share)await navigator.share({title:player.live.title,url});else await navigator.clipboard.writeText(url);if(isAuthenticated)await supabase.rpc('record_live_share',{p_live_id:player.live.id,p_channel:navigator.share?'native':'copy_link'});setFeedback(navigator.share?'Live compartilhada.':'Link da live copiado.');}catch{/* sharing cancelled */}};
  const createOffer=async()=>{if(!supabase||!player||!currentCreator?.id)return;const amount=Number(offerForm.amount),max=Number(offerForm.max_orders);if(!offerForm.title.trim()||!Number.isFinite(amount)||amount<=0)return;const {error}=await supabase.from('live_offers').insert({live_id:player.live.id,creator_id:currentCreator.id,title:offerForm.title.trim(),description:offerForm.description.trim(),amount,currency:'BRL',status:'active',max_orders:Number.isFinite(max)&&max>0?max:null});if(error){setFeedback(error.message);return;}setOfferForm({title:'',description:'',amount:'20',max_orders:'1'});await loadEngagement(player.live.id);};
  const buyOffer=async(offer:any)=>checkout({kind:'live_offer',offerId:offer.id,currency:offer.currency});

  const buySolo=async(live:Live)=>{
    if(!isAuthenticated){setFeedback('Faça login para solicitar uma Live Solo.');return;}
    if(!live.solo_enabled||!live.solo_price)return;
    if(!window.confirm(`Solicitar Live Solo por R$ ${Number(live.solo_price).toFixed(2).replace('.',',')}?`))return;
    await checkout({kind:'live_solo',creatorId:live.creator_id,liveId:live.id,amount:Number(live.solo_price)});
  };

  const enterLive=async(live:Live)=>{
    if(!isAuthenticated){setFeedback('Faça login para assistir às lives, inclusive as gratuitas.');return;}
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
  useEffect(()=>{
    const target=initialLiveId&&lives.find(l=>l.id===initialLiveId);
    if(!target)return;
    setFocusedLiveId(target.id);
    document.querySelector(`[data-live-card-id="${target.id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
    if(target.status==='live'&&!player&&!joining)void enterLive(target);
    if(target.status==='scheduled')setFeedback(`Live agendada para ${formatDate(target.scheduled_at)}.`);
  },[initialLiveId,lives.length,isAuthenticated]);

  const toggle=(id:string)=>setReminded(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
  const formatDate=(value?:string)=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Horário a confirmar';

  return (
    <div className="min-h-screen bg-[#09090b] px-4 pb-28 pt-24 text-white">
      <div className="mx-auto max-w-5xl">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4"/>Voltar</button>
        <div className="mb-8 flex items-center justify-between gap-4">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Comunidade Velvet</p><h1 className="text-3xl font-black">Lives</h1><p className="mt-2 text-zinc-400">Lives abertas, exclusivas para planos e experiências Live Solo.</p></div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><Radio className="mr-1 inline h-3 w-3"/>{lives.filter(x=>x.status==='live').length} ao vivo</div>
        </div>
        {feedback&&<div role="status" className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{feedback}</div>}
        {loading?<div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-rose-400"/></div>:
          lives.length===0?<div className="rounded-3xl border border-dashed border-zinc-700 p-12 text-center text-zinc-500">Nenhuma live publicada no momento.</div>:
          <div className="grid gap-5 md:grid-cols-3">
            {lives.map(live=>(
              <article key={live.id} data-live-card-id={live.id} className={`overflow-hidden rounded-3xl border bg-gradient-to-br from-rose-950 to-zinc-950 transition ${focusedLiveId===live.id?'border-rose-500 ring-2 ring-rose-500/30':'border-zinc-800'}`}>
                <div className="flex h-44 items-end justify-between p-4">
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${live.status==='live'?'bg-rose-600':'bg-zinc-950/70'}`}>{live.status==='live'?'AO VIVO':'AGENDADA'}</span>
                  <span className="rounded-lg bg-black/40 px-2 py-1 text-[10px]">{live.required_plan==="free"?"GRÁTIS":live.required_plan.toUpperCase()}</span>
                </div>
                <div className="bg-black/30 p-4">
                  <h2 className="font-bold">{live.title}</h2>
                  <p className="mt-1 text-sm text-zinc-300">{live.creator_name||'Criador verificado'}</p>
                  <p className="mt-2 text-xs font-semibold text-amber-300">{live.required_plan==="free"?"Acesso aberto e gratuito":live.required_plan==="vip"?"Somente VIP":"Plus ou VIP"}</p>
                  {live.status==='live'?(
                    <div className="mt-4 space-y-2">
                      <button data-live-id={live.id} onClick={()=>enterLive(live)} disabled={joining===live.id} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold hover:bg-rose-500 disabled:opacity-50">{joining===live.id?<Loader2 className="h-4 w-4 animate-spin"/>:<Radio className="h-4 w-4"/>}Entrar na live</button>
                      {live.tips_enabled&&<button onClick={()=>sendTip(live)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm font-bold text-amber-300">💰 Enviar gorjeta</button>}
                      {live.solo_enabled&&<button onClick={()=>buySolo(live)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 py-2.5 text-sm font-bold text-violet-300">🔒 Live Solo • R$ {Number(live.solo_price||0).toFixed(2).replace('.',',')}</button>}
                    </div>
                  ):(
                    <button onClick={()=>toggle(live.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-2.5 text-sm font-bold hover:border-rose-500"><Bell className="h-4 w-4"/>{reminded.includes(live.id)?'Lembrete ativado':formatDate(live.scheduled_at)}</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        }
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><MessageCircle className="h-5 w-5 text-rose-400"/>Chat moderado</h2><p className="mt-2 text-sm text-zinc-400">Mensagens, denúncias e bloqueios são tratados pelas regras de moderação da plataforma.</p></div>
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-400"/>Segurança</h2><p className="mt-2 text-sm text-zinc-400">A reprodução só é liberada após validar sessão, 18+, plano e fonte aprovada pelo servidor.</p></div>
        </div>
      </div>

      {player&&(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-800 bg-[#111116]">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-rose-400">AO VIVO</p><h2 className="font-bold">{player.live.title}</h2></div>
              <div className="flex items-center gap-2">
                {player.sources.length>1&&<div className="relative"><button onClick={()=>setQualityOpen(v=>!v)} className="rounded-xl border border-zinc-700 p-2" title="Qualidade"><Settings className="h-4 w-4"/></button>{qualityOpen&&<div className="absolute right-0 top-11 z-20 w-36 rounded-xl border border-zinc-700 bg-black p-1">{player.sources.map(src=><button key={src.label+src.url} onClick={()=>{setPlayer({...player,selected:src});setQualityOpen(false)}} className={`block w-full rounded-lg px-3 py-2 text-left text-xs ${player.selected.url===src.url?'bg-rose-600':'hover:bg-zinc-800'}`}>{src.label}</button>)}</div>}</div>}
                <button onClick={()=>{setPlayer(null);setQualityOpen(false)}} className="rounded-xl border border-zinc-700 p-2"><X className="h-4 w-4"/></button>
              </div>
            </div>
            <div className="relative">
              <AdaptiveVideo key={player.selected.url} sourceUrl={player.selected.url} sourceType={player.selected.type} controls autoPlay playsInline className="aspect-video w-full bg-black object-contain" onPlaybackError={message=>setFeedback(message)}/>
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2"><span className="rounded-md bg-rose-600 px-2 py-1 text-[10px] font-black tracking-wider">AO VIVO</span>{regional.watermark&&<span className="rounded-md border border-white/15 bg-black/50 px-2 py-1 text-[10px] font-black tracking-[.16em] text-white/85 backdrop-blur-sm">VELVET <b className="text-rose-400">VIP</b></span>}</div>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_340px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  {regional.likes&&<button onClick={toggleLike} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${hasLiked?'border-rose-500 bg-rose-500/15 text-rose-300':'border-zinc-700'}`}><Heart className={`h-4 w-4 ${hasLiked?'fill-current':''}`}/>{likesCount}</button>}
                  {regional.sharing&&<button onClick={shareLive} className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold"><Share2 className="h-4 w-4"/>Compartilhar</button>}
                </div>
                {player.live.tips_enabled&&<div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3"><p className="flex items-center gap-2 text-xs font-bold text-amber-300"><DollarSign className="h-4 w-4"/>Enviar gorjeta • {regional.currency}</p><div className="mt-2 flex flex-wrap gap-2">{regional.presets.map(value=><button key={value} onClick={()=>sendPresetTip(player.live,value)} className="rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-black text-amber-300">{new Intl.NumberFormat(detectedLocale,{style:'currency',currency:regional.currency,maximumFractionDigits:0}).format(value)}</button>)}</div>{regional.currency!=='BRL'&&<p className="mt-2 text-[10px] text-zinc-500">O checkout em USD será liberado quando o gateway regional estiver configurado no Admin.</p>}</div>}
                {regional.offers&&<div className="mt-4 space-y-2"><h3 className="text-sm font-bold">Pedidos do criador</h3>{offers.length?offers.map(o=><div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3"><div><p className="text-xs font-bold">{o.title}</p><p className="text-[10px] text-zinc-500">{o.description} • {o.orders_count}/{o.max_orders||'∞'}</p></div><button disabled={o.status!=='active'} onClick={()=>buyOffer(o)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-black disabled:bg-zinc-800">{new Intl.NumberFormat(o.currency==='USD'?'en-US':'pt-BR',{style:'currency',currency:o.currency}).format(Number(o.amount))}</button></div>):<p className="text-xs text-zinc-500">Nenhum pedido disponível.</p>}</div>}
                {regional.offers&&currentCreator?.id===player.live.creator_id&&<div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3"><h3 className="flex items-center gap-2 text-xs font-bold text-violet-300"><Plus className="h-4 w-4"/>Criar pedido pago na live</h3><div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={offerForm.title} onChange={e=>setOfferForm({...offerForm,title:e.target.value})} placeholder="O que você fará" className="rounded-xl bg-zinc-950 p-2 text-xs"/><input value={offerForm.description} onChange={e=>setOfferForm({...offerForm,description:e.target.value})} placeholder="Descrição" className="rounded-xl bg-zinc-950 p-2 text-xs"/><input type="number" min="1" value={offerForm.amount} onChange={e=>setOfferForm({...offerForm,amount:e.target.value})} placeholder="Valor em R$" className="rounded-xl bg-zinc-950 p-2 text-xs"/><input type="number" min="1" value={offerForm.max_orders} onChange={e=>setOfferForm({...offerForm,max_orders:e.target.value})} placeholder="Quantidade" className="rounded-xl bg-zinc-950 p-2 text-xs"/></div><button onClick={createOffer} className="mt-2 w-full rounded-xl bg-violet-600 py-2 text-xs font-bold">Publicar pedido</button></div>}
                <p className="mt-3 text-xs text-zinc-500">Qualidade: {player.selected.label}. As opções exibidas vêm do provedor real de streaming.</p>
              </div>
              {regional.comments&&<aside className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3"><h3 className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="h-4 w-4 text-sky-300"/>Comentários ao vivo</h3><div className="mt-3 max-h-52 space-y-2 overflow-y-auto">{comments.map(c=><div key={c.id} className="rounded-lg bg-zinc-900 p-2 text-xs"><b>{c.user?.name||'Membro'}</b><p className="mt-0.5 text-zinc-300">{c.content}</p></div>)}{!comments.length&&<p className="text-xs text-zinc-500">Seja o primeiro a comentar.</p>}</div><div className="mt-3 flex gap-2"><input value={comment} maxLength={500} onChange={e=>setComment(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void addComment()}} placeholder="Escreva um comentário" className="min-w-0 flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-xs"/><button onClick={addComment} className="rounded-xl bg-sky-600 p-2"><Send className="h-4 w-4"/></button></div></aside>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
