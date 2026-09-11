import React, { useState } from 'react';
import { Search, Sparkles, TrendingUp, Play, Lock, Heart, Users } from 'lucide-react';
import { Video } from '../../types';
import { dbService } from '../../services/db';

interface ExplorePageProps {
  onSelectVideo: (videoId: string) => void;
  onSelectCreator: (creatorId: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  onSelectVideo,
  onSelectCreator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [categoriesList, setCategoriesList] = useState<string[]>(() => [
    'Todos',
    ...dbService.getCategories().map(c => c.name)
  ]);

  React.useEffect(() => {
    const unsub = dbService.subscribe(() => {
      setCategoriesList(['Todos', ...dbService.getCategories().map(c => c.name)]);
    });
    return unsub;
  }, []);

  const creators = dbService.getCreators();
  const allVideos = dbService.getVideos('foryou');

  const filteredVideos = allVideos.filter((v) => {
    const matchesCat = selectedCategory === 'Todos' || v.category === selectedCategory;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesCat;

    const matchesTitle = v.title.toLowerCase().includes(term);
    const matchesDesc = v.description.toLowerCase().includes(term);
    const matchesCreator = v.creator?.display_name.toLowerCase().includes(term) || v.creator?.handle.toLowerCase().includes(term);
    const matchesTags = v.hashtags?.some((t) => t.toLowerCase().includes(term));

    return matchesCat && (matchesTitle || matchesDesc || matchesCreator || matchesTags);
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-16 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Search Input Bar */}
      <div className="relative mb-6">
        <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar vídeos, criadores ou #hashtags..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value.trim().length >= 3) dbService.recordSearch(e.target.value); }}
          className="w-full pl-12 pr-4 py-3.5 bg-[#141419] border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors shadow-lg"
        />
      </div>

      {/* Trending Creators Carousel */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            <span>Criadores em Destaque</span>
          </h3>
          <span className="text-[11px] text-zinc-400">Verificados 18+</span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
          {creators.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCreator(c.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group w-20"
            >
              <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 group-hover:scale-105 transition-transform shadow-md">
                <img
                  src={c.avatar_url}
                  alt={c.display_name}
                  className="w-full h-full rounded-full object-cover border-2 border-[#09090b]"
                  referrerPolicy="no-referrer"
                />
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 absolute -top-1 -right-1" />
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
