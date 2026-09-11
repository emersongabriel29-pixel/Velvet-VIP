import React, { useState } from 'react';
import { X, Copy, Check, Share2, Send, MessageCircle } from 'lucide-react';
import { Video } from '../../types';

interface ShareModalProps {
  video: Video;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ video, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/#video-${video.id}`;
  const shareText = `Confira esse vídeo de ${video.creator?.display_name || 'criador'} no Velvet VIP! 🔥`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: shareText,
        url: shareUrl,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const shareWhatsapp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  return (
    <div id="share-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div id="share-modal-card" className="w-full sm:max-w-md bg-[#121216] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-white text-base font-display">Compartilhar Vídeo</h3>
          </div>
          <button
            id="close-share-btn"
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video mini preview */}
        <div className="flex items-center gap-3 p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-12 h-16 object-cover rounded-lg shrink-0 border border-zinc-700"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-white truncate">{video.title}</h4>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{video.creator?.display_name}</p>
            {video.is_premium && (
              <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                VIP Exclusivo
              </span>
            )}
          </div>
        </div>

        {/* Social buttons */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <button
            onClick={shareWhatsapp}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs transition-colors cursor-pointer"
          >
            <MessageCircle className="w-6 h-6 fill-emerald-500/20" />
            <span className="text-[11px]">WhatsApp</span>
          </button>

          <button
            onClick={shareTelegram}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-sky-950/40 hover:bg-sky-950/70 border border-sky-500/30 text-sky-400 text-xs transition-colors cursor-pointer"
          >
            <Send className="w-6 h-6 fill-sky-500/20" />
            <span className="text-[11px]">Telegram</span>
          </button>

          <button
            onClick={shareTwitter}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs transition-colors cursor-pointer"
          >
            <span className="w-6 h-6 flex items-center justify-center font-black text-base font-display">𝕏</span>
            <span className="text-[11px]">Twitter/X</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 text-rose-400 text-xs transition-colors cursor-pointer"
          >
            <Share2 className="w-6 h-6" />
            <span className="text-[11px]">Outros</span>
          </button>
        </div>

        {/* Copy Link input */}
        <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-xl">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-transparent text-xs text-zinc-300 px-2 focus:outline-none truncate"
          />
          <button
            id="copy-link-btn"
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
