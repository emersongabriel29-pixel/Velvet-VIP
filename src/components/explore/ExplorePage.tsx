import React, { useState } from 'react';
import { Search, Sparkles, TrendingUp, Play, Lock, Heart, Radio, CalendarClock, Package, TicketPercent } from 'lucide-react';
import { Video, Creator, LivePreview } from '../../types';
import { listCategories, loadExplore } from '../../services/accountData';
import type { ProductTool } from '../product/ProductHub';

interface ExplorePageProps {
  onSelectVideo: (videoId: string) => void;
  onSelectCreator: (creatorId: string) => void;
  onOpenLive: (liveId: string) => void;
  onOpenTool: (tool: ProductTool) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  onSelectVideo,
  onSelectCreator,
  onOpenLive,
  onOpenTool,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [categoriesList, setCategoriesList] = useState<string[]>(['Todos']);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [allVideos, setVideos] = useState<Video[]>([]);
  const [lives, setLives] = useState<LivePreview[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let active = true;
    Promise.all([listCategories(), loadExplore()]).then(([categories, result]) => {
      if (!active) return;
      setCategoriesList(['Todos', ...categories.map(c => c.name)]);
      setCreators(result.creators); setVideos(result.videos); setLives(result.lives);
    }).catch(() => { if (active) setError('Não foi possível carregar o catálogo. Tente novamente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const liveCreatorIds = new Set(lives.filter(live => live.status === 'live').map(live => live.creator_id));
  const formatSchedule = (value?: string) => value
    ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Horário a confirmar';



  const filteredVideos = allVideos.filter((v) => {
    const matchesCat = selectedCategory === 'Todos' || v.category === selectedCategory;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesCat;

    const matchesTitle = v.title.toLowerCase().includes(term);
    const matchesDesc = (v.description || '').toLowerCase().includes(term);
    const matchesCreator = v.creator?.display_name.toLowerCase().includes(term) || v.creator?.handle.toLowerCase().includes(term);
    const matchesTags = v.hashtags?.some((t) => t.toLowerCase().includes(term));

    return matchesCat && (matchesTitle || matchesDesc || matchesCreator || matchesTags);
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-16 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
      {error && <p role="alert" className="mb-4 text-rose-400">{error}</p>}
      {loading && <p role="status">Carregando catálogo…</p>}
      {/* Search Input Bar */}
      <div className="relative mb-6">
        <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar vídeos, criadores ou #hashtags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-[#141419] border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors shadow-lg"
        />
      </div>

      <section className="mb-6" aria-labelledby="explore-discovery-heading">
        <h2 id="explore-discovery-heading" className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Descobrir</h2>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={()=>onOpenTool('premieres')} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-left hover:border-rose-500/40"><Radio className="mb-2 h-4 w-4 text-rose-400"/><span className="text-xs font-bold">Estreias</span></button>
          <button type="button" onClick={()=>onOpenTool('bundles')} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-left hover:border-rose-500/40"><Package className="mb-2 h-4 w-4 text-rose-400"/><span className="text-xs font-bold">Pacotes</span></button>
          <button type="button" onClick={()=>onOpenTool('coupons')} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-left hover:border-rose-500/40"><TicketPercent className="mb-2 h-4 w-4 text-rose-400"/><span className="text-xs font-bold">Cupons</span></button>
        </div>
      </section>

      {/* Live and scheduled sessions */}
      {lives.length > 0 && <section className="mb-8" aria-labelledby="explore-live-heading">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="explore-live-heading" className="flex items-center gap-2 text-sm font-bold text-white font-display">
            <Radio className="h-4 w-4 text-rose-500" /> Lives em destaque
          </h3>
          <span className="text-[11px] text-zinc-400">{lives.filter(live => live.status === 'live').length} ao vivo</span>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {lives.map(live => <button
            key={live.id}
            type="button"
            data-explore-live-id={live.id}
            onClick={() => onOpenLive(live.id)}
            className={`group w-64 shrink-0 overflow-hidden rounded-2xl border text-left transition ${live.status === 'live' ? 'border-rose-500/40 bg-gradient-to-br from-rose-950/80 to-zinc-950 hover:border-rose-400' : 'border-zinc-800 bg-zinc-900/70 hover:border-amber-500/50'}`}
          >
            <div className="flex items-center gap-3 p-4">
              <div className="relative h-14 w-14 shrink-0 rounded-full border-2 border-zinc-800 bg-zinc-950 p-0.5">
                {live.creator?.avatar_url ? <img src={live.creator.avatar_url} alt="" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" /> : <Radio className="m-3.5 h-5 w-5 text-rose-400" />}
                {live.status === 'live' && <span className="absolute inset-0 rounded-full ring-2 ring-rose-500/70 animate-pulse" />}
              </div>
              <div className="min-w-0 flex-1">
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-black ${live.status === 'live' ? 'bg-rose-600 text-white' : 'bg-amber-500/15 text-amber-300'}`}>
                  {live.status === 'live' ? <><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> AO VIVO</> : <><CalendarClock className="h-3 w-3" /> AGENDADA</>}
                </span>
                <p className="mt-1.5 truncate text-sm font-bold text-white">{live.title}</p>
                <p className="truncate text-[11px] text-zinc-400">{live.creator?.display_name || 'Criador verificado'}</p>
                <p className="mt-1 text-[10px] text-zinc-500">{live.status === 'live' ? 'Abrir transmissão' : formatSchedule(live.scheduled_at)}</p>
              </div>
            </div>
          </button>)}
        </div>
      </section>}

      {/* Trending Creators Carousel */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            <span>Criadores em Destaque</span>
          </h3>
          <span className="text-[11px] text-zinc-400">Perfis aprovados</span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
          {creators.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCreator(c.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group w-20"
            >
              <div className={`relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 group-hover:scale-105 transition-transform shadow-md ${liveCreatorIds.has(c.id) ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-[#09090b] animate-pulse' : ''}`}>
                <img
                  src={c.avatar_url}
                  alt={c.display_name}
                  className="w-full h-full rounded-full object-cover border-2 border-[#09090b]"
                  referrerPolicy="no-referrer"
                />
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 absolute -top-1 -right-1" />
                {liveCreatorIds.has(c.id) && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-rose-600 px-1.5 py-0.5 text-[8px] font-black text-white">LIVE</span>}
              </div>
              <span className="text-xs font-semibold text-zinc-200 text-center truncate w-full group-hover:text-white">
                {c.display_name}
              </span>
              <span className="text-[10px] text-zinc-500 truncate w-full text-center">
                @{c.handle}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
        {categoriesList.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Discovered Videos Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs text-zinc-400">
          <span>{filteredVideos.length} vídeos encontrados</span>
        </div>

        {filteredVideos.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.5]" />
            <p className="text-sm font-semibold text-zinc-400">Nenhum resultado encontrado</p>
            <p className="text-xs mt-1">Tente pesquisar por outro termo ou selecione uma categoria diferente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredVideos.map((v) => (
              <div
                key={v.id}
                onClick={() => onSelectVideo(v.id)}
                className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 transition-all cursor-pointer shadow-lg"
              >
                <img
                  src={v.thumbnail_url}
                  alt={v.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {v.is_premium && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/80 backdrop-blur-md text-zinc-950 text-[10px] font-black uppercase flex items-center gap-1 shadow">
                    <Lock className="w-2.5 h-2.5" />
                    <span>VIP</span>
                  </div>
                )}

                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-white text-[10px]">
                  {v.category}
                </div>

                <div className="absolute bottom-2 left-2 right-2">
                  <h4 className="text-xs font-bold text-white truncate drop-shadow">{v.title}</h4>
                  <div className="flex items-center justify-between text-[10px] text-zinc-300 mt-1">
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3 fill-white" />
                      {v.views_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                      {v.likes_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
