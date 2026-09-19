import React,{useEffect,useState} from 'react';
import { Loader2,Save } from 'lucide-react';
import { supabase,isSupabaseConfigured } from '../../lib/supabase';

type CreatorPlan={name:string;tier:'basic'|'vip'|'exclusive';monthly_price:number;semiannual_price:number;annual_price:number;benefits:string[];is_active:boolean};
const defaults:CreatorPlan[]=[
 {name:'Básico',tier:'basic',monthly_price:29.90,semiannual_price:149.90,annual_price:299.90,benefits:['Conteúdo exclusivo'],is_active:true},
 {name:'VIP',tier:'vip',monthly_price:59.90,semiannual_price:299.90,annual_price:599.90,benefits:['Conteúdo VIP','Lives pagas'],is_active:true},
 {name:'Exclusivo',tier:'exclusive',monthly_price:99.90,semiannual_price:499.90,annual_price:999.90,benefits:['Conteúdo exclusivo','Atendimento prioritário'],is_active:true}
];

export const CreatorPlansManager:React.FC<{creatorId:string}>=({creatorId})=>{
 const [plans,setPlans]=useState<CreatorPlan[]>(defaults);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');

 useEffect(()=>{let cancelled=false;(async()=>{
   if(!supabase||!isSupabaseConfigured||creatorId.startsWith('cr-')){setLoading(false);return;}
   const {data,error}=await supabase.from('creator_plans').select('name,tier,billing_period,price,benefits,is_active').eq('creator_id',creatorId);
   if(error){if(!cancelled)setMessage(error.message);setLoading(false);return;}
   const grouped=defaults.map(base=>{
     const rows=(data||[]).filter((r:any)=>r.tier===base.tier);
     const by=(period:string)=>rows.find((r:any)=>r.billing_period===period);
     const monthly:any=by('monthly'),semi:any=by('semiannual'),annual:any=by('annual');
     return {...base,
       name:monthly?.name||rows[0]?.name||base.name,
       monthly_price:Number(monthly?.price??base.monthly_price),
       semiannual_price:Number(semi?.price??base.semiannual_price),
       annual_price:Number(annual?.price??base.annual_price),
       benefits:Array.isArray(monthly?.benefits)?monthly.benefits:Array.isArray(rows[0]?.benefits)?rows[0].benefits:base.benefits,
       is_active:rows.length?rows.some((r:any)=>r.is_active):base.is_active
     };
   });
   if(!cancelled)setPlans(grouped);
   setLoading(false);
 })();return()=>{cancelled=true}},[creatorId]);

 const save=async()=>{
   if(!supabase||!isSupabaseConfigured)return;
   setSaving(true);setMessage('');
   const rows=plans.flatMap(p=>[
     {creator_id:creatorId,name:p.name,tier:p.tier,billing_period:'monthly',price:p.monthly_price,benefits:p.benefits,is_active:p.is_active},
     {creator_id:creatorId,name:p.name,tier:p.tier,billing_period:'semiannual',price:p.semiannual_price,benefits:p.benefits,is_active:p.is_active},
     {creator_id:creatorId,name:p.name,tier:p.tier,billing_period:'annual',price:p.annual_price,benefits:p.benefits,is_active:p.is_active}
   ]);
   const {error}=await supabase.from('creator_plans').upsert(rows,{onConflict:'creator_id,tier,billing_period'});
   setMessage(error?.message||'Planos salvos no Supabase.');
   setSaving(false);
 };

 if(loading)return <div className="mt-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-rose-400"/></div>;
 return <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Planos de assinatura</h2><p className="mt-1 text-xs text-zinc-500">Mensal, semestral e anual são registros reais usados pelo checkout.</p></div><button onClick={save} disabled={saving||!isSupabaseConfigured} className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold disabled:opacity-50"><Save className="h-4 w-4"/>{saving?'Salvando...':'Salvar'}</button></div>{message&&<p className="mt-3 text-xs text-amber-300">{message}</p>}<div className="mt-5 grid gap-3 md:grid-cols-3">{plans.map((p,i)=><article key={p.tier} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><input value={p.name} onChange={e=>setPlans(v=>v.map((x,j)=>j===i?{...x,name:e.target.value}:x))} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm font-bold"/>{(['monthly_price','semiannual_price','annual_price'] as const).map(field=><label key={field} className="block text-xs text-zinc-500">{field==='monthly_price'?'Mensal':field==='semiannual_price'?'Semestral':'Anual'} (R$)<input type="number" min="4.90" max="999.90" step=".01" value={p[field]} onChange={e=>setPlans(v=>v.map((x,j)=>j===i?{...x,[field]:Number(e.target.value)}:x))} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"/></label>)}<textarea value={p.benefits.join('\n')} onChange={e=>setPlans(v=>v.map((x,j)=>j===i?{...x,benefits:e.target.value.split('\n').map(x=>x.trim()).filter(Boolean)}:x))} placeholder="Benefícios, um por linha" className="min-h-16 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs"/><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={p.is_active} onChange={e=>setPlans(v=>v.map((x,j)=>j===i?{...x,is_active:e.target.checked}:x))}/> Ativo</label></article>)}</div></section>;
};
