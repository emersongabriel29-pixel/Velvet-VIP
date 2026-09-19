import React, { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, TrendingUp, Play, Lock, Heart, Loader2 } from 'lucide-react';
import { Creator, Video } from '../../types';
import { dbService } from '../../services/db';
import { isDemoMode, supabase } from '../../lib/supabase';
import { resolvePrivateMediaRefs } from '../../services/media';

interface ExplorePageProps {
  onSelectVideo: (videoId: string) => void;
  onSelectCreator: (creatorId: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ onSelectVideo, onSelectCreator }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [categoriesList, setCategoriesList] = useState<string[]>(['Todos']);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (isDemoMode) {
          if (cancelled) return;
          setCategoriesList(['Todos', ...dbService.getCategories().map(c => c.name)]);
          setCreators(dbService.getCreators());
          setAllVideos(dbService.getVideos('foryou'));
          return;
        }
        if (!supabase) throw new Error('Supabase não configurado.');

        const [categoryRows, creatorRows, videoRows] = await Promise.all([
          supabase.from('system_categories').select('name').eq('is_active', true).order('sort_order'),
          supabase.from('creators').select('*').eq('is_approved', true).order('total_followers', { ascending: false }).limit(20),
          supabase.from('videos').select('*, creator:creators(*)')
            .eq('is_draft', false)
            .eq('is_removed', false)
            .eq('moderation_status', 'approved')
            .eq('media_status', 'ready')
            .order('created_at', { ascending: false })
            .limit(100),
        ]);
        if (categoryRows.error) throw categoryRows.error;
        if (creatorRows.error) throw creatorRows.error;
        if (videoRows.error) throw videoRows.error;

        const creatorData = (creatorRows.data || []) as Creator[];
        const videoData = (videoRows.data || []) as Video[];
        const refs = [
          ...creatorData.map(c => c.avatar_url),
          ...videoData.map(v => v.thumbnail_url),
          ...videoData.map(v => v.creator?.avatar_url || ''),
        ].filter(Boolean);
        const resolved = await resolvePrivateMediaRefs(refs, 900);
        const resolvedCreators = creatorData.map(c => ({ ...c, avatar_url: resolved.get(c.avatar_url) || c.avatar_url }));
        const resolvedVideos = videoData.map(v => ({
          ...v,
          thumbnail_url: resolved.get(v.thumbnail_url) || v.thumbnail_url,
          creator: v.creator ? {
            ...v.creator,
            avatar_url: resolved.get(v.creator.avatar_url) || v.creator.avatar_url,
          } : v.creator,
        }));

        if (cancelled) return;
        setCategoriesList(['Todos', ...(categoryRows.data || []).map((row: any) => row.name)]);
        setCreators(resolvedCreators);
        setAllVideos(resolvedVideos);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Não foi possível carregar a área Explorar.');
          setCreators([]);
          setAllVideos([]);
          setCategoriesList(['Todos']);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    if (isDemoMode) {
      const unsubscribe = dbService.subscribe(() => { void load(); });
      return () => { cancelled = true; unsubscribe(); };
    }
    return () => { cancelled = true; };
  }, []);

  const filteredVideos = useMemo(() => allVideos.filter((v) => {
    const matchesCat = selectedCategory === 'Todos' || v.category === selectedCategory;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesCat;
    const matchesTitle = (v.title || '').toLowerCase().includes(term);
    const matchesDesc = (v.description || '').toLowerCase().includes(term);
    const matchesCreator = (v.creator?.display_name || '').toLowerCase().includes(term) || (v.creator?.handle || '').toLowerCase().includes(term);
    const matchesTags = v.hashtags?.some((t) => t.toLowerCase().includes(term));
    return matchesCat && (matchesTitle || matchesDesc || matchesCreator || matchesTags);
  }), [allVideos, selectedCategory, searchTerm]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-16 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
      <div className="relative mb-6">
        <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Buscar vídeos, criadores ou #hashtags..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-[#141419] border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors shadow-lg" />
      </div>

      {error && <div role="alert" className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">{error}</div>}
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-rose-400" /></div> : <>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-display"><TrendingUp className="w-4 h-4 text-rose-500" /><span>Criadores em Destaque</span></h3>
            <span className="text-[11px] text-zinc-400">Criadores aprovados</span>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
            {creators.map((c) => <button key={c.id} onClick={() => onSelectCreator(c.id)} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group w-20">
              <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 group-hover:scale-105 transition-transform shadow-md">
                <img src={c.avatar_url} alt={c.display_name} className="w-full h-full rounded-full object-cover border-2 border-[#09090b]" referrerPolicy="no-referrer" />
                {c.verified && <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 absolute -top-1 -right-1" />}
              </div>
              <span className="text-xs font-semibold text-zinc-200 text-center truncate w-full group-hover:text-white">{c.display_name}</span>
              <span className="text-[10px] text-zinc-500 truncate w-full text-center">@{c.handle}</span>
            </button>)}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
          {categoriesList.map((cat) => <button key={cat} onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${selectedCategory === cat ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}>
            {cat}
          </button>)}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 text-xs text-zinc-400"><span>{filteredVideos.length} vídeos encontrados</span></div>
          {filteredVideos.length === 0 ? <div className="py-16 text-center text-zinc-500"><Search className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.5]" /><p className="text-sm font-semibold text-zinc-400">Nenhum resultado encontrado</p></div> :
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredVideos.map((v) => <button key={v.id} onClick={() => onSelectVideo(v.id)} className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 transition-all cursor-pointer shadow-lg text-left">
              <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
              {v.is_premium && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/80 backdrop-blur-md text-zinc-950 text-[10px] font-black uppercase flex items-center gap-1"><Lock className="w-2.5 h-2.5" />VIP</div>}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-white text-[10px]">{v.category}</div>
              <div className="absolute bottom-2 left-2 right-2"><h4 className="text-xs font-bold text-white truncate">{v.title}</h4><div className="flex items-center justify-between text-[10px] text-zinc-300 mt-1"><span className="flex items-center gap-1"><Play className="w-3 h-3 fill-white" />{v.views_count}</span><span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-500 fill-rose-500" />{v.likes_count}</span></div></div>
            </button>)}
          </div>}
        </div>
      </>}
    </div>
  );
};
