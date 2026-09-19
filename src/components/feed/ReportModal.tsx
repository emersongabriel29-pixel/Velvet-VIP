import React, { useState } from 'react';
import { X, Flag, CheckCircle2, Loader2 } from 'lucide-react';
import { ReportReason, Video } from '../../types';
import { dbService } from '../../services/db';
import { isDemoMode, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ReportModalProps { video: Video; isOpen: boolean; onClose: () => void; }

const REPORT_CATEGORIES: { id: ReportReason; label: string; desc: string }[] = [
  { id: 'unauthorized_content', label: 'Conteúdo não autorizado', desc: 'Direitos autorais ou imagem publicada sem autorização.' },
  { id: 'privacy_violation', label: 'Violação de privacidade', desc: 'Exposição indevida de dados pessoais ou gravações íntimas não consentidas.' },
  { id: 'fake_identity', label: 'Falsa identidade', desc: 'Se passando por outra pessoa ou criador verificado.' },
  { id: 'spam', label: 'Spam ou golpe', desc: 'Links fraudulentos, anúncios não autorizados ou automação abusiva.' },
  { id: 'underage_suspicion', label: 'Suspeita de menor de idade', desc: 'Prioridade máxima: qualquer suspeita de indivíduo menor de 18 anos.' },
  { id: 'other', label: 'Outro motivo', desc: 'Outras violações das diretrizes de comunidade Velvet VIP.' },
];

export const ReportModal: React.FC<ReportModalProps> = ({ video, isOpen, onClose }) => {
  const { isAuthenticated } = useAuth();
  const [selectedReason, setSelectedReason] = useState<ReportReason>('unauthorized_content');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if(!isAuthenticated && !isDemoMode){setError('Entre na sua conta para enviar uma denúncia.');return;}
    setSubmitting(true);
    try{
      if(isDemoMode){
        dbService.submitReport({target_type:'video',target_id:video.id,target_title:video.title,reason:selectedReason,description:description.trim()||'Denúncia padrão do usuário'});
      }else{
        if(!supabase) throw new Error('Supabase indisponível.');
        const {error:rpcError}=await supabase.rpc('submit_content_report',{p_target_type:'video',p_target_id:video.id,p_reason:selectedReason,p_description:description.trim()||'Denúncia padrão do usuário'});
        if(rpcError) throw rpcError;
      }
      setSubmitted(true);
      setTimeout(()=>{setSubmitted(false);onClose();},1600);
    }catch(err:any){
      const raw=String(err?.message||'');
      setError(raw.includes('rate_limited')?'Limite de denúncias atingido. Tente novamente mais tarde.':raw||'Não foi possível enviar a denúncia.');
    }finally{setSubmitting(false);}
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
    <div className="w-full max-w-md bg-[#121216] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-rose-500"><Flag className="w-5 h-5" /><h3 className="font-bold text-white">Denunciar Conteúdo</h3></div><button onClick={onClose} className="p-1 text-zinc-400"><X className="w-5 h-5" /></button></div>
      {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</p>}
      {submitted ? <div className="py-8 text-center space-y-2"><CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" /><h4 className="text-white font-bold">Denúncia Enviada</h4><p className="text-xs text-zinc-400">A denúncia foi registrada no sistema de moderação.</p></div> :
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-300">Denunciando: <strong className="text-white">{video.title}</strong></div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">{REPORT_CATEGORIES.map(cat=><label key={cat.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs ${selectedReason===cat.id?'bg-rose-950/40 border-rose-600/60':'bg-zinc-900/50 border-zinc-800'}`}><input type="radio" checked={selectedReason===cat.id} onChange={()=>setSelectedReason(cat.id)} /><div><div className="font-semibold text-zinc-200">{cat.label}</div><div className="text-[11px] text-zinc-500">{cat.desc}</div></div></label>)}</div>
        <textarea rows={3} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Detalhes adicionais (opcional)" className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white resize-none" />
        <div className="flex gap-2"><button type="button" onClick={onClose} className="flex-1 py-2.5 bg-zinc-800 rounded-xl text-xs">Cancelar</button><button disabled={submitting} type="submit" className="flex-1 py-2.5 bg-rose-600 rounded-xl text-xs font-semibold disabled:opacity-50">{submitting?<Loader2 className="mx-auto h-4 w-4 animate-spin"/>:'Enviar Denúncia'}</button></div>
      </form>}
    </div>
  </div>;
};
