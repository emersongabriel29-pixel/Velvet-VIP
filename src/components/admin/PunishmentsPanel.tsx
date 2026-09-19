import React,{useEffect,useState} from 'react';
import {Gavel,ShieldAlert,Undo2,FolderOpen} from 'lucide-react';
import {supabase} from '../../lib/supabase';

const scopes=[['account','Conta inteira'],['publish','Publicar'],['live','Abrir lives'],['comment','Comentar'],['message','Mensagens'],['purchase','Compras'],['monetization','Monetização'],['withdrawal','Saques']] as const;

export const PunishmentsPanel:React.FC=()=>{
  const [users,setUsers]=useState<any[]>([]);
  const [actions,setActions]=useState<any[]>([]);
  const [appeals,setAppeals]=useState<any[]>([]);
  const [cases,setCases]=useState<any[]>([]);
  const [selectedCase,setSelectedCase]=useState<any|null>(null);
  const [form,setForm]=useState({user_id:'',reason_code:'policy_violation',action_type:'restriction',duration:'7',internal_note:'',user_message:'',scopes:['publish'] as string[]});
  const [msg,setMsg]=useState('');

  const load=async()=>{
    if(!supabase)return;
    const[{data:u},{data:a},{data:ap},{data:caseRows}]=await Promise.all([
      supabase.from('profiles').select('id,name,username,role').limit(200),
      supabase.from('moderation_actions').select('*,account_restrictions(scope,is_active)').order('created_at',{ascending:false}).limit(100),
      supabase.from('moderation_appeals').select('*').in('status',['submitted','reviewing']).order('created_at',{ascending:false}),
      supabase.from('moderation_cases').select('id,subject_user_id,subject_creator_id,content_report_id,reason_code,summary,status,created_at').in('status',['open','reviewing']).order('created_at',{ascending:false}).limit(100)
    ]);
    setUsers(u||[]);setActions(a||[]);setAppeals(ap||[]);setCases(caseRows||[]);
  };
  useEffect(()=>{void load()},[]);

  const chooseCase=(c:any)=>{
    setSelectedCase(c);
    setForm(v=>({...v,user_id:c.subject_user_id,reason_code:c.reason_code||v.reason_code,internal_note:c.summary||''}));
    setMsg(c.content_report_id?'Denúncia vinculada carregada. Escolha a medida adequada.':'Caso carregado.');
  };

  const apply=async()=>{
    if(!supabase||!form.user_id)return;
    const end=form.duration==='permanent'?null:new Date(Date.now()+Number(form.duration)*86400000).toISOString();
    const {error}=await supabase.rpc('apply_moderation_action',{
      p_subject_user_id:form.user_id,
      p_action_type:form.action_type,
      p_reason_code:form.reason_code,
      p_scopes:form.scopes,
      p_ends_at:end,
      p_internal_note:form.internal_note,
      p_user_message:form.user_message,
      p_case_id:selectedCase?.id||null
    });
    if(error){setMsg(error.message);return;}
    setMsg('Punição aplicada atomicamente e registrada na auditoria.');
    setSelectedCase(null);
    setForm(v=>({...v,user_id:'',internal_note:'',user_message:''}));
    await load();
  };

  const revoke=async(a:any)=>{
    if(!supabase)return;
    const {error}=await supabase.rpc('revoke_moderation_action',{p_action_id:a.id});
    setMsg(error?.message||'Punição revogada e restrições desativadas.');
    if(!error)await load();
  };

  return <section className="space-y-5">
    <div><h2 className="text-xl font-black"><Gavel className="mr-2 inline h-5 w-5 text-rose-400"/>Punições e suspensões</h2><p className="text-sm text-zinc-500">Medidas atômicas: caso, ação, restrições e auditoria são gravados juntos.</p></div>

    {cases.length>0&&<div className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><FolderOpen className="h-4 w-4"/>Casos aguardando decisão ({cases.length})</h3><div className="space-y-2">{cases.map(c=><button key={c.id} onClick={()=>chooseCase(c)} className={`w-full rounded-xl border p-3 text-left text-sm ${selectedCase?.id===c.id?'border-rose-500 bg-rose-950/20':'border-zinc-800 bg-zinc-950/40'}`}><b>{c.reason_code}</b><p className="mt-1 truncate text-xs text-zinc-500">{c.summary||'Sem resumo'}{c.content_report_id?' • originado de denúncia':''}</p></button>)}</div></div>}

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
        <select value={form.user_id} disabled={Boolean(selectedCase)} onChange={e=>setForm({...form,user_id:e.target.value})} className="w-full rounded-xl bg-zinc-950 p-3 disabled:opacity-60"><option value="">Selecione usuário/criador</option>{users.map(u=><option key={u.id} value={u.id}>{u.name||u.username} • {u.role}</option>)}</select>
        <div className="grid grid-cols-2 gap-2"><select value={form.action_type} onChange={e=>setForm({...form,action_type:e.target.value})} className="rounded-xl bg-zinc-950 p-3"><option value="warning">Advertência</option><option value="restriction">Restrição</option><option value="suspension">Suspensão</option><option value="demonetization">Desmonetização</option><option value="deactivation">Desativação</option><option value="permanent_ban">Banimento permanente</option></select><select value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})} className="rounded-xl bg-zinc-950 p-3">{['1','3','7','15','30','90'].map(x=><option key={x} value={x}>{x} dias</option>)}<option value="permanent">Permanente</option></select></div>
        <input value={form.reason_code} onChange={e=>setForm({...form,reason_code:e.target.value})} placeholder="Motivo/código" className="w-full rounded-xl bg-zinc-950 p-3"/>
        <div className="grid grid-cols-2 gap-2">{scopes.map(([id,label])=><label key={id} className="rounded-xl border border-zinc-800 p-2 text-xs"><input type="checkbox" checked={form.scopes.includes(id)} onChange={e=>setForm({...form,scopes:e.target.checked?[...form.scopes,id]:form.scopes.filter(x=>x!==id)})}/> {label}</label>)}</div>
        <textarea value={form.internal_note} onChange={e=>setForm({...form,internal_note:e.target.value})} placeholder="Justificativa interna/evidências" className="min-h-20 w-full rounded-xl bg-zinc-950 p-3"/>
        <textarea value={form.user_message} onChange={e=>setForm({...form,user_message:e.target.value})} placeholder="Mensagem que o usuário receberá" className="min-h-20 w-full rounded-xl bg-zinc-950 p-3"/>
        <button onClick={apply} disabled={!form.user_id} className="w-full rounded-xl bg-rose-600 p-3 font-bold disabled:opacity-40">Aplicar medida</button>{msg&&<p className="text-xs text-zinc-400">{msg}</p>}
      </div>
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><h3 className="font-bold">Recursos aguardando análise</h3><p className="mt-1 text-3xl font-black">{appeals.length}</p><p className="text-xs text-zinc-500">Recursos enviados por usuários/criadores.</p></div>
    </div>

    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><h3 className="mb-3 font-bold">Histórico disciplinar</h3><div className="space-y-2">{actions.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 py-3 text-sm"><div><b>{a.action_type}</b><p className="text-xs text-zinc-500">{a.reason_code} • {a.ends_at?new Date(a.ends_at).toLocaleString('pt-BR'):'Permanente'} • {a.status}</p></div>{a.status==='active'&&<button onClick={()=>revoke(a)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs"><Undo2 className="mr-1 inline h-3 w-3"/>Revogar</button>}</div>)}</div></div>
  </section>;
};