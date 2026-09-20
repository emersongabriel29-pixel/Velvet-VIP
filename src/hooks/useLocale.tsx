import React, {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {isSupabaseConfigured,supabase} from '../lib/supabase';

export type AppLocale='pt-BR'|'en-US';
const messages={
  'pt-BR':{forYou:'Para você',following:'Seguindo',trending:'Em alta',new:'Novos',presentation:'Apresentação',login:'Entrar',more:'Mais',home:'Início',explore:'Explorar',activity:'Atividade',profile:'Perfil',create:'Criar'},
  'en-US':{forYou:'For you',following:'Following',trending:'Trending',new:'New',presentation:'About',login:'Sign in',more:'More',home:'Home',explore:'Explore',activity:'Activity',profile:'Profile',create:'Create'},
} as const;
type MessageKey=keyof typeof messages['pt-BR'];
type LocaleContextValue={locale:AppLocale;currency:'BRL'|'USD';setLocale:(v:AppLocale)=>void;t:(key:MessageKey)=>string;formatMoney:(value:number,currency?:string)=>string};
const LocaleContext=createContext<LocaleContextValue|null>(null);
const detect=():AppLocale=>{const saved=localStorage.getItem('velvet_locale');if(saved==='pt-BR'||saved==='en-US')return saved;return (navigator.language||'pt-BR').toLowerCase().startsWith('en')?'en-US':'pt-BR';};

export const LocaleProvider:React.FC<{children:React.ReactNode}>=({children})=>{
 const [locale,setLocaleState]=useState<AppLocale>(detect);
 const [supported,setSupported]=useState<AppLocale[]>(['pt-BR','en-US']);
 useEffect(()=>{if(!isSupabaseConfigured||!supabase)return;supabase.from('app_content_settings').select('supported_locales,default_locale').eq('id','global').maybeSingle().then(({data})=>{const rows=(data?.supported_locales||[]).filter((x:string)=>x==='pt-BR'||x==='en-US') as AppLocale[];if(rows.length)setSupported(rows);if(!localStorage.getItem('velvet_locale')&&(data?.default_locale==='pt-BR'||data?.default_locale==='en-US'))setLocaleState(detect());});},[]);
 const setLocale=(value:AppLocale)=>{if(!supported.includes(value))return;localStorage.setItem('velvet_locale',value);document.documentElement.lang=value;setLocaleState(value);};
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 const value=useMemo<LocaleContextValue>(()=>({locale,currency:locale==='en-US'?'USD':'BRL',setLocale,t:key=>messages[locale][key],formatMoney:(amount,currency=locale==='en-US'?'USD':'BRL')=>new Intl.NumberFormat(locale,{style:'currency',currency}).format(amount)}),[locale,supported]);
 return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};
export const useLocale=()=>{const ctx=useContext(LocaleContext);if(!ctx)throw new Error('useLocale must be used within LocaleProvider');return ctx;};
