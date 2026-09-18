import React, { useState, useEffect } from 'react';
import { X, Send, Heart, MessageSquare } from 'lucide-react';
import { Comment } from '../../types';
import { dbService } from '../../services/db';
import { useAuth } from '../../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface CommentsModalProps {
  videoId: string;
  videoTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  videoId,
  videoTitle,
  isOpen,
  onClose,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputContent, setInputContent] = useState('');

  useEffect(() => {
    if (isOpen && videoId) {
      setComments(dbService.getComments(videoId));
    }
  }, [isOpen, videoId]);

  const handleLike = async (comment: Comment) => {
    if (!isAuthenticated || !currentUser.id) return;
    if (!isSupabaseConfigured || !supabase) return;
    const liked = likedIds.has(comment.id);
    setLikedIds(prev => { const n=new Set(prev); liked?n.delete(comment.id):n.add(comment.id); return n; });
    setComments(prev => prev.map(x => x.id===comment.id ? {...x, likes_count: Math.max(0,(x.likes_count||0)+(liked?-1:1))} : x));
    const { error } = await supabase.rpc('toggle_comment_like', { p_comment_id: comment.id });
    if (error) {
      setLikedIds(prev => { const n=new Set(prev); liked?n.add(comment.id):n.delete(comment.id); return n; });
      setComments(prev => prev.map(x => x.id===comment.id ? {...x, likes_count: Math.max(0,(x.likes_count||0)+(liked?1:-1))} : x));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    const newC = dbService.addComment(videoId, inputContent.trim());
    setComments([newC, ...comments]);
    setInputContent('');
  };

  return (
    <div id="comments-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="comments-sheet-container"
        className="w-full sm:max-w-md h-[80vh] sm:h-[650px] bg-[#121216] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-[#15151c]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-rose-500" />
            <span className="font-bold text-sm text-white">Comentários ({comments.length})</span>
          </div>
          <button
            id="close-comments-btn"
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video reference hint */}
        <div className="px-5 py-2 bg-zinc-900/50 border-b border-zinc-800/40 text-xs text-zinc-400 truncate">
          Sobre: <span className="text-zinc-200">{videoTitle}</span>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <MessageSquare className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-sm font-medium text-zinc-400">Nenhum comentário ainda</p>
              <p className="text-xs">Seja o primeiro a deixar um comentário para o criador!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 group">
                <img
                  src={comment.user_avatar}
                  alt={comment.user_name}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      {comment.user_name}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      @{comment.user_handle}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed break-words">
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-[10px] text-zinc-500">
                    <span>
                      {new Date(comment.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button className="hover:text-zinc-300 cursor-pointer">Responder</button>
                  </div>
                </div>

                <button
                  onClick={() => handleLike(comment)}
                  disabled={!isAuthenticated}
                  className={`p-1 flex flex-col items-center gap-0.5 shrink-0 ${likedIds.has(comment.id) ? 'text-rose-500' : 'text-zinc-500 hover:text-rose-500'} ${isAuthenticated ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                  title={isAuthenticated ? "Curtir comentário" : "Entre para curtir"}
                >
                  <Heart className={`w-3.5 h-3.5 ${likedIds.has(comment.id) ? 'fill-current' : ''}`} />
                  <span className="text-[10px]">{comment.likes_count > 0 ? comment.likes_count : ''}</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 bg-[#15151c] flex items-center gap-2">
          <img
            src={currentUser.avatar_url}
            alt={currentUser.name}
            className="w-7 h-7 rounded-full object-cover border border-zinc-700 shrink-0"
            referrerPolicy="no-referrer"
          />
          <input
            id="comment-input"
            type="text"
            placeholder="Adicione um comentário..."
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
          <button
            id="comment-submit-btn"
            type="submit"
            disabled={!inputContent.trim()}
            className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
