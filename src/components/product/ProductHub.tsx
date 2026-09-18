import React from 'react';
import { Search, Bookmark, PlayCircle, Bell, MessageCircle, TicketPercent, Package, LifeBuoy, Radio, Target, Clapperboard, Heart, Activity } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export type ProductTool='search'|'saved'|'continue'|'live_schedule'|'messages'|'wishlist'|'bundles'|'coupons'|'premieres'|'support'|'goals'|'clips'|'operations';

type Tool = { id: ProductTool; title: string; icon: React.ElementType };
type Section = { title: string; items: Tool[] };

export const ProductHub:React.FC<{onOpen:(v:ProductTool)=>void}>=({onOpen})=>{
  const { currentUser, currentCreator } = useAuth();
  const isApprovedCreator = currentUser.role === 'creator' && currentCreator?.is_approved === true;
  const isAdmin = currentUser.role === 'admin';

  const sections: Section[] = [
    { title:'Para você', items:[
      {id:'search',title:'Busca',icon:Search},
      {id:'saved',title:'Salvos',icon:Bookmark},
      {id:'continue',title:'Continuar',icon:PlayCircle},
      {id:'wishlist',title:'Lista PPV',icon:Heart},
    ]},
    { title:'Comunidade', items:[
      {id:'live_schedule',title:'Agenda de lives',icon:Bell},
      {id:'messages',title:'Mensagens',icon:MessageCircle},
      {id:'premieres',title:'Estreias',icon:Radio},
    ]},
    { title:'Ofertas', items:[
      {id:'bundles',title:'Pacotes',icon:Package},
      {id:'coupons',title:'Cupons',icon:TicketPercent},
    ]},
    { title:'Ajuda', items:[
      {id:'support',title:'Suporte',icon:LifeBuoy},
    ]},
  ];

  if (isApprovedCreator) sections.push({
    title:'Área do criador',
    items:[
      {id:'goals',title:'Metas',icon:Target},
      {id:'clips',title:'Clipes de lives',icon:Clapperboard},
    ]
  });

  if (isAdmin) sections.push({
    title:'Administração',
    items:[{id:'operations',title:'Status operacional',icon:Activity}]
  });

  return (
    <section className="mx-auto max-w-3xl px-4 pb-28 pt-20">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Mais</h1>
        <p className="mt-1 text-sm text-zinc-500">Atalhos para recursos do Velvet VIP.</p>
      </div>

      <div className="space-y-7">
        {sections.map(section=>(
          <div key={section.title}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{section.title}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {section.items.map(({id,title,icon:Icon})=>(
                <button
                  key={id}
                  onClick={()=>onOpen(id)}
                  className="group min-h-[86px] rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 text-left transition hover:border-rose-500/40 hover:bg-zinc-900 active:scale-[0.98]"
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                    <Icon className="h-4 w-4"/>
                  </div>
                  <span className="block text-sm font-bold text-zinc-100">{title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
