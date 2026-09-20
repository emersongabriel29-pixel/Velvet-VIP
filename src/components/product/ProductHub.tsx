import React from 'react';
import { Bell, BookOpen, Compass, HelpCircle, LayoutDashboard, LogIn, Package, Scale, ShieldAlert, TicketPercent, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export type ProductTool='search'|'saved'|'continue'|'live_schedule'|'messages'|'wishlist'|'bundles'|'coupons'|'premieres'|'support'|'goals'|'clips'|'operations';

type HubItem={id:string;title:string;subtitle:string;icon:React.ElementType;action:()=>void};
type Section={title:string;items:HubItem[]};

interface ProductHubProps {
  onOpen:(tool:ProductTool)=>void;
  onNavigate:(view:string)=>void;
  onOpenLgpd:()=>void;
  onOpenAuth:()=>void;
}

export const ProductHub:React.FC<ProductHubProps>=({onOpen,onNavigate,onOpenLgpd,onOpenAuth})=>{
  const {currentUser,currentCreator,isAuthenticated}=useAuth();
  const sections:Section[]=[];

  if(isAuthenticated) sections.push({title:'Sua conta',items:[
    {id:'profile',title:'Perfil e configurações',subtitle:'Foto, capa, conta e privacidade',icon:User,action:()=>onNavigate('profile')},
    {id:'library',title:'Biblioteca e compras',subtitle:'PPV, assinaturas, salvos e histórico',icon:BookOpen,action:()=>onNavigate('purchases')},
    {id:'activity',title:'Atividade e mensagens',subtitle:'Notificações e conversas',icon:Bell,action:()=>onNavigate('activity')},
  ]});

  sections.push({title:'Descobrir',items:[
    {id:'explore',title:'Explorar',subtitle:'Busca, criadores, vídeos, lives e estreias',icon:Compass,action:()=>onNavigate('explore')},
    {id:'bundles',title:'Pacotes',subtitle:'Conteúdos reunidos em ofertas especiais',icon:Package,action:()=>onOpen('bundles')},
    {id:'coupons',title:'Cupons',subtitle:'Descontos e benefícios disponíveis',icon:TicketPercent,action:()=>onOpen('coupons')},
  ]});

  if(currentUser.role==='creator'&&currentCreator?.is_approved) sections.push({title:'Criador',items:[
    {id:'creator',title:'Painel do Criador',subtitle:'Conteúdo, metas, clipes e recebimentos',icon:LayoutDashboard,action:()=>onNavigate('creator_studio')},
  ]});
  if(currentUser.role==='admin') sections.push({title:'Administração',items:[
    {id:'admin',title:'Centro do Administrador',subtitle:'Operação, regras, campanhas e segurança',icon:ShieldAlert,action:()=>onNavigate('admin')},
  ]});

  sections.push({title:'Ajuda e legal',items:[
    {id:'support',title:'Central de suporte',subtitle:'Abra e acompanhe solicitações',icon:HelpCircle,action:()=>onOpen('support')},
    {id:'legal',title:'LGPD, termos e 18+',subtitle:'Privacidade, direitos e regras',icon:Scale,action:onOpenLgpd},
    ...(!isAuthenticated?[{id:'login',title:'Entrar ou criar conta',subtitle:'Acesse os recursos da sua conta',icon:LogIn,action:onOpenAuth}]:[]),
  ]});

  return <section className="mx-auto max-w-3xl px-4 pb-28 pt-20">
    <div className="mb-6"><h1 className="text-2xl font-black tracking-tight">Mais</h1><p className="mt-1 text-sm text-zinc-500">Conta, ajuda e acessos principais sem repetir as outras telas.</p></div>
    <div className="space-y-7">{sections.map(section=><div key={section.title}>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{section.title}</h2>
      <div className="grid gap-2.5 sm:grid-cols-2">{section.items.map(({id,title,subtitle,icon:Icon,action})=><button key={id} type="button" onClick={action} className="group flex min-h-[88px] items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 text-left transition hover:border-rose-500/40 hover:bg-zinc-900 active:scale-[0.98]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400"><Icon className="h-5 w-5"/></span>
        <span className="min-w-0"><span className="block text-sm font-bold text-zinc-100">{title}</span><span className="mt-1 block text-xs leading-snug text-zinc-500">{subtitle}</span></span>
      </button>)}</div>
    </div>)}</div>
  </section>;
};
