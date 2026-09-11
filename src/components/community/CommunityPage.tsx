import React, { useEffect, useState } from 'react';
import { BookOpen, ListVideo, MessageSquare, Trophy, Award, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type Tab = 'stories' | 'polls' | 'playlists' | 'progress';

export const CommunityPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>('stories');
  const [stories, setStories] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>({ points: 0, level: 1, badges: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isSupabaseConfigured || !supabase || !currentUser.id) {
        if (mounted) { setLoading(false); setMessage('Configure o Supabase e entre em uma conta para carregar a comunidade.'); }
        return;
      }
      try {
        const [storyResult, pollResult, playlistResult, pointsResult, badgesResult] = await Promise.all([
          supabase.from('stories').select('id,caption,media_url,expires_at,creator:creators(display_name,avatar_url)').eq('moderation_status', 'approved').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }),
          supabase.from('creator_polls').select('id,question,options,expires_at,creator:creators(display_name)').eq('is_active', true).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('created_at', { ascending: false }),
          supabase.from('playlists').select('id,name,is_private,created_at').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
          supabase.from('user_points').select('points,level').eq('user_id', currentUser.id).maybeSingle(),
          supabase.from('user_badges').select('id,badge_key,earned_at').eq('user_id', currentUser.id).order('earned_at', { ascending: false }),
        ]);
        const firstError = [storyResult, pollResult, playlistResult, pointsResult, badgesResult].find(result => result.error)?.error;
        if (firstError) throw firstError;
        if (mounted) {
          setStories(storyResult.data || []);
          setPolls(pollResult.data || []);
          setPlaylists(playlistResult.data || []);
          setProgress({ points: pointsResult.data?.points || 0, level: pointsResult.data?.level || 1, badges: badgesResult.data || [] });
        }
      } catch (error: any) {
        if (mounted) setMessage(error.message || 'Não foi possível carregar a comunidade.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [currentUser.id]);

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'stories', label: 'Stories', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'polls', label: 'Enquetes', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'playlists', label: 'Playlists', icon: <ListVideo className="h-4 w-4" /> },
    { id: 'progress', label: 'Minha evolução', icon: <Trophy className="h-4 w-4" /> },
  ];

  return <div className="min-h-screen bg-[#09090b] px-4 pb-28 pt-24 text-white"><div className="mx-auto max-w-5xl">
    <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</button>
    <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Comunidade Velvet</p><h1 className="text-3xl font-black">Entretenimento</h1><p className="mt-2 text-zinc-400">Acompanhe criadores, participe e avance por mérito real.</p></div>
    <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2 sm:grid-cols-4">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold ${tab === item.id ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>{item.icon}{item.label}</button>)}</div>
    {message && <div role="status" className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{message}</div>}
    {loading ? <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-rose-400" /></div> : tab === 'stories' ? <section><div className="mb-4 flex items-center gap-2 text-lg font-bold"><BookOpen className="h-5 w-5 text-rose-400" /> Stories aprovados</div>{stories.length === 0 ? <Empty text="Nenhum story aprovado disponível agora." /> : <div className="grid gap-4 sm:grid-cols-3">{stories.map(story => <article key={story.id} className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70"><div className="h-56 bg-zinc-950"><img src={story.media_url} alt={story.caption || 'Story'} className="h-full w-full object-cover" /></div><div className="p-4"><p className="font-bold">{story.creator?.display_name || 'Criador'}</p><p className="mt-1 text-sm text-zinc-400">{story.caption || 'Story exclusivo da comunidade'}</p></div></article>)}</div>}</section> : tab === 'polls' ? <section><div className="mb-4 flex items-center gap-2 text-lg font-bold"><MessageSquare className="h-5 w-5 text-rose-400" /> Enquetes dos criadores</div>{polls.length === 0 ? <Empty text="Nenhuma enquete ativa no momento." /> : <div className="grid gap-4 sm:grid-cols-2">{polls.map(poll => <article key={poll.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><p className="text-xs text-zinc-500">{poll.creator?.display_name || 'Criador'}</p><h2 className="mt-2 font-bold">{poll.question}</h2><div className="mt-4 space-y-2">{(Array.isArray(poll.options) ? poll.options : []).map((option: any, index: number) => <button key={index} className="w-full rounded-xl border border-zinc-700 px-3 py-2 text-left text-sm hover:border-rose-500">{typeof option === 'string' ? option : option.label || `Opção ${index + 1}`}</button>)}</div></article>)}</div>}</section> : tab === 'playlists' ? <section><div className="mb-4 flex items-center gap-2 text-lg font-bold"><ListVideo className="h-5 w-5 text-rose-400" /> Minhas playlists</div>{playlists.length === 0 ? <Empty text="Crie playlists para organizar seus vídeos favoritos." /> : <div className="grid gap-4 sm:grid-cols-3">{playlists.map(list => <article key={list.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><ListVideo className="h-7 w-7 text-rose-400" /><h2 className="mt-4 font-bold">{list.name}</h2><p className="mt-1 text-xs text-zinc-500">{list.is_private ? 'Privada' : 'Pública'}</p></article>)}</div>}</section> : <section><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-6"><Trophy className="h-7 w-7 text-amber-300" /><p className="mt-4 text-sm text-zinc-400">Nível atual</p><p className="text-3xl font-black text-amber-300">{progress.level}</p><p className="mt-2 text-xs text-zinc-500">Ganhe pontos por participação legítima.</p></div><div className="rounded-3xl border border-rose-500/20 bg-rose-950/10 p-6"><Sparkles className="h-7 w-7 text-rose-300" /><p className="mt-4 text-sm text-zinc-400">Pontos</p><p className="text-3xl font-black text-rose-300">{progress.points}</p><p className="mt-2 text-xs text-zinc-500">Indicações liberam benefícios, não dinheiro.</p></div><div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-6"><Award className="h-7 w-7 text-emerald-300" /><p className="mt-4 text-sm text-zinc-400">Distintivos</p><p className="text-3xl font-black text-emerald-300">{progress.badges.length}</p><p className="mt-2 text-xs text-zinc-500">Conquistas verificadas da comunidade.</p></div></div><div className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"><h2 className="font-bold">Progressão justa</h2><p className="mt-2 text-sm text-zinc-400">Curtidas, comentários, compartilhamentos e tempo de uso podem gerar pontos, com limites contra spam. Nenhum nível libera conteúdo explícito gratuitamente.</p></div></section>}
  </div></div>;
};

const Empty: React.FC<{ text: string }> = ({ text }) => <div className="rounded-3xl border border-dashed border-zinc-700 p-12 text-center text-sm text-zinc-500">{text}</div>;
