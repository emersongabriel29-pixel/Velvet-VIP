import React, { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ReportReason, Video } from '../../types';
import { dbService } from '../../services/db';

interface ReportModalProps {
  video: Video;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_CATEGORIES: { id: ReportReason; label: string; desc: string }[] = [
  { id: 'unauthorized_content', label: 'Conteúdo não autorizado', desc: 'Direitos autorais ou imagem publicada sem autorização.' },
  { id: 'privacy_violation', label: 'Violação de privacidade', desc: 'Exposição indevida de dados pessoais ou gravações íntimas não consentidas.' },
  { id: 'fake_identity', label: 'Falsa identidade', desc: 'Se passando por outra pessoa ou criador verificado.' },
  { id: 'spam', label: 'Spam ou golpe', desc: 'Links fraudulentos, anúncios não autorizados ou automação abusiva.' },
  { id: 'underage_suspicion', label: 'Suspeita de menor de idade', desc: 'Prioridade máxima: qualquer suspeita de indivíduo menor de 18 anos.' },
  { id: 'other', label: 'Outro motivo', desc: 'Outras violações das diretrizes de comunidade Velvet VIP.' },
];

export const ReportModal: React.FC<ReportModalProps> = ({ video, isOpen, onClose }) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('unauthorized_content');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.submitReport({
      target_type: 'video',
      target_id: video.id,
      target_title: video.title,
      reason: selectedReason,
      description: description.trim() || 'Denúncia padrão do usuário',
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div id="report-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div id="report-modal-card" className="w-full max-w-md bg-[#121216] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-500">
            <Flag className="w-5 h-5" />
            <h3 className="font-bold text-white text-base font-display">Denunciar Conteúdo</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-white font-bold text-base">Denúncia Enviada</h4>
            <p className="text-xs text-zinc-400">
              Nossa equipe de moderação e segurança irá analisar este conteúdo com prioridade. Obrigado por manter a plataforma segura.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-300">
              Denunciando: <strong className="text-white">{video.title}</strong> de <span className="text-rose-400">@{video.creator?.handle}</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Selecione o motivo da denúncia:
              </label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {REPORT_CATEGORIES.map((cat) => (
                  <label
                    key={cat.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${
                      selectedReason === cat.id
                        ? 'bg-rose-950/40 border-rose-600/60 text-white'
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      checked={selectedReason === cat.id}
                      onChange={() => setSelectedReason(cat.id)}
                      className="mt-0.5 text-rose-600 bg-zinc-900 border-zinc-700 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-semibold text-zinc-200">{cat.label}</div>
                      <div className="text-[11px] text-zinc-500">{cat.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Detalhes adicionais (opcional):
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explique o que há de errado com o conteúdo..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                Enviar Denúncia
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
