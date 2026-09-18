import React, { useState, useRef } from 'react';
import { X, Upload, Film, CheckCircle2, Sparkles, Image, Lock, Globe, Users } from 'lucide-react';
import { dbService } from '../../services/db';
import { isSupabaseConfigured } from '../../lib/supabase';
import { uploadCreatorVideo } from '../../services/media';

interface UploadModalProps {
  mode?: 'short' | 'long';
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SAMPLE_PRESET_VIDEOS = [
  {
    name: 'Neon Glamour Studio (Vertical HD)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-neon-light-41551-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&fit=crop',
  },
  {
    name: 'Ensaio Sensual Noir (Vertical HD)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-posing-for-the-camera-in-a-studio-41558-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&fit=crop',
  },
  {
    name: 'Fitness VIP & Workout (Vertical HD)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-light-41550-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&fit=crop',
  },
  {
    name: 'Golden Hour Sunset (Vertical HD)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-red-lips-and-smoky-eyes-41555-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&fit=crop',
  }
];

export const UploadModal: React.FC<UploadModalProps> = ({ mode = 'short', isOpen, onClose, onSuccess }) => {
  const [videoUrl, setVideoUrl] = useState(SAMPLE_PRESET_VIDEOS[0].url);
  const [thumbnailUrl, setThumbnailUrl] = useState(SAMPLE_PRESET_VIDEOS[0].thumb);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const systemCategories = dbService.getCategories();
  const [category, setCategory] = useState(systemCategories[0]?.name || 'Glamour & Lifestyle');
  const [hashtagsStr, setHashtagsStr] = useState('velvetvip, bastidores, exclusivo');
  const [accessType, setAccessType] = useState<'public' | 'followers' | 'premium'>('public');
  const [premiumPrice, setPremiumPrice] = useState(19.90);
  const [requiredTier, setRequiredTier] = useState<'basic' | 'vip'>('vip');
  const [isDraft, setIsDraft] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(1);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  // Handle local video file upload and automatically extract video thumbnail with canvas!
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['video/mp4','video/webm','video/quicktime'].includes(file.type) || file.size > 512 * 1024 * 1024) {
      setUploadError('Use MP4, WEBM ou MOV com até 512 MB.'); return;
    }
    setUploadError('');
    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setVideoUrl(localUrl);

    // Capture thumbnail automatically
    const tempVideo = document.createElement('video');
    tempVideo.src = localUrl;
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.muted = true;
    tempVideo.currentTime = 1.0;

    tempVideo.onloadeddata = () => {
      setDurationSeconds(Number.isFinite(tempVideo.duration) ? tempVideo.duration : 1);
      tempVideo.currentTime = Math.min(1.0, Math.max(0, (tempVideo.duration || 1) / 4));
    };

    tempVideo.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = tempVideo.videoWidth || 720;
        canvas.height = tempVideo.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg', 0.85);
          setThumbnailUrl(thumb);
          canvas.toBlob(blob => setThumbnailBlob(blob), 'image/jpeg', 0.85);
        }
      } catch (err) {
        console.warn('Could not extract canvas frame, using default thumb', err);
      }
    };
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!title.trim()) return;
    setUploadError('');
    setIsDraft(asDraft);
    setIsUploading(true);
    setUploadProgress(10);
    const tags = hashtagsStr.split(/[,\s#]+/).map(t=>t.trim().toLowerCase()).filter(Boolean);
    try {
      if (isSupabaseConfigured) {
        if (!selectedFile) throw new Error('Selecione um arquivo do dispositivo para publicar em produção.');
        setUploadProgress(30);
        await uploadCreatorVideo({
          file:selectedFile,thumbnail:thumbnailBlob,title:title.trim(),description:description.trim(),
          category,hashtags:tags,isPremium:accessType==='premium',
          premiumPrice:accessType==='premium'?premiumPrice:0,
          requiredTier:accessType==='premium'?requiredTier:'free',isDraft:asDraft,
          contentKind:mode as 'short' | 'long',durationSeconds
        });
        setUploadProgress(100);
      } else {
        dbService.uploadVideo({
          title:title.trim(),description:description.trim(),video_url:videoUrl,thumbnail_url:thumbnailUrl,
          category,hashtags:tags,is_premium:accessType==='premium',
          premium_price:accessType==='premium'?premiumPrice:0,
          required_tier:accessType==='premium'?requiredTier:'free',is_draft:asDraft,content_kind:mode as 'short' | 'long'
        });
        setUploadProgress(100);
      }
      setUploadSuccess(true);
      setTimeout(()=>{setUploadSuccess(false);onClose();onSuccess?.();},900);
    } catch (err:any) {
      setUploadError(err?.message || 'Falha ao publicar o vídeo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div id="upload-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div id="upload-modal-container" className="w-full max-w-2xl bg-[#121216] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-[#16161d] flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-500">
            <Film className="w-5 h-5" />
            <h3 className="font-bold text-white text-base font-display">{mode === 'long' ? 'Publicar Vídeo Longo' : 'Publicar Novo Vídeo Vertical (9:16)'}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploadError && <div role="alert" className="mx-5 mt-4 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">{uploadError}</div>}
        {uploadSuccess ? (
          <div className="py-16 text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-xl font-bold text-white font-display">
              {isDraft ? 'Salvo como Rascunho!' : 'Vídeo Publicado com Sucesso!'}
            </h4>
            <p className="text-xs text-zinc-400">
              {mode === 'long' ? 'Seu vídeo longo foi publicado e ficará disponível no perfil do criador.' : 'Seu conteúdo já está processado e disponível no feed dos seus seguidores e assinantes.'}
            </p>
          </div>
        ) : isUploading ? (
          <div className="py-16 px-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center mx-auto animate-pulse">
              <Upload className="w-7 h-7 text-rose-500" />
            </div>
            <h4 className="text-base font-bold text-white">{isSupabaseConfigured ? 'Enviando vídeo com segurança...' : (mode === 'long' ? 'Preparando vídeo longo...' : 'Preparando vídeo vertical...')}</h4>
            <div className="max-w-md mx-auto w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-600 to-amber-500 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400">{uploadProgress}% concluído • Upload privado</p>
          </div>
        ) : (
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* Top row: Video selector & preview */}
            <div className="grid sm:grid-cols-2 gap-4 items-start">
              {/* Vertical video live preview */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  {mode === 'long' ? 'Prévia do vídeo longo:' : 'Prévia Vertical (9:16):'}
                </label>
                <div className={`relative ${mode === 'long' ? 'aspect-video w-full' : 'aspect-[9/16] w-44'} mx-auto rounded-2xl overflow-hidden bg-black border border-zinc-700 shadow-lg`}>
                  <video
                    ref={videoPreviewRef}
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] text-white font-bold">
                    {mode === 'long' ? 'VÍDEO LONGO' : '9:16 HD'}
                  </span>
                </div>
              </div>

              {/* Upload controls & Sample presets */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-zinc-300">
                  Fonte do Vídeo:
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-rose-500 hover:bg-rose-950/10 transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer text-zinc-300 group"
                >
                  <Upload className="w-6 h-6 text-zinc-400 group-hover:text-rose-500 transition-colors" />
                  <span className="text-xs font-bold text-white">Carregar Arquivo do Dispositivo</span>
                  <span className="text-[10px] text-zinc-500">{mode === 'long' ? 'MP4, WEBM ou MOV • horizontal recomendado (16:9)' : 'MP4, WEBM ou MOV • vertical recomendado (9:16)'}</span>
                </button>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-zinc-400 block">
                    Ou selecione um vídeo de teste Ultra HD:
                  </span>
                  <div className="space-y-1">
                    {SAMPLE_PRESET_VIDEOS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setVideoUrl(p.url);
                          setThumbnailUrl(p.thumb);
                        }}
                        className={`w-full p-2 rounded-xl text-left text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                          videoUrl === p.url
                            ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-semibold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <Film className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Details Form */}
            <div className="space-y-4 pt-2 border-t border-zinc-800">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Título do Vídeo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bastidores do novo ensaio VIP 🔥"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Descrição & Detalhes
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva o que acontece no vídeo para seus seguidores..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {systemCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Hashtags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={hashtagsStr}
                    onChange={(e) => setHashtagsStr(e.target.value)}
                    placeholder="vip, ensaio, glamour"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Access Control & Monetization */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-300">
                  Tipo de Acesso & Monetização:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccessType('public')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs transition-all cursor-pointer ${
                      accessType === 'public'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Público</span>
                    <span className="text-[10px] opacity-70">Gratuito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessType('followers')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs transition-all cursor-pointer ${
                      accessType === 'followers'
                        ? 'bg-sky-950/40 border-sky-500 text-sky-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Seguidores</span>
                    <span className="text-[10px] opacity-70">Apenas membros</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessType('premium')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs transition-all cursor-pointer ${
                      accessType === 'premium'
                        ? 'bg-gradient-to-br from-rose-950/60 to-amber-950/40 border-rose-500 text-rose-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>VIP Exclusivo</span>
                    <span className="text-[10px] opacity-70">Monetizado</span>
                  </button>
                </div>

                {accessType === 'premium' && (
                  <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 grid sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Preço Avulso (Pay-Per-View em R$):
                      </label>
                      <input
                        type="number"
                        min="5"
                        step="0.10"
                        value={premiumPrice}
                        onChange={(e) => setPremiumPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-[#141419] border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Liberado para Assinantes:
                      </label>
                      <select
                        value={requiredTier}
                        onChange={(e) => setRequiredTier(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-[#141419] border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value="basic">Plano Básico e VIP</option>
                        <option value="vip">Apenas Assinantes VIP Gold</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!uploadSuccess && !isUploading && (
          <div className="p-4 border-t border-zinc-800 bg-[#16161d] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Salvar Rascunho
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={!title.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:brightness-110 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-rose-950/40 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              <span>Publicar Agora</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
