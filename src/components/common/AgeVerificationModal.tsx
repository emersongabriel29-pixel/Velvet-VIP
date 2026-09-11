import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AgeVerificationModal: React.FC = () => {
  const { hasConsented18Plus, confirmAgeVerification } = useAuth();
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');

  if (hasConsented18Plus) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('Você deve confirmar ter mais de 18 anos e aceitar os termos.');
      return;
    }

    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    if (age < 18) {
      setError('Acesso negado: Você deve ter pelo menos 18 anos completos para acessar esta plataforma.');
      return;
    }

    setError('');
    confirmAgeVerification(birthDate);
  };

  return (
    <div id="age-verification-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div id="age-verification-card" className="w-full max-w-md bg-[#121216] border border-rose-950/60 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-rose-950/20 text-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto w-16 h-16 rounded-full bg-rose-950/50 border border-rose-600/30 flex items-center justify-center text-rose-500 mb-4 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-3">
          <Lock className="w-3 h-3" />
          ÁREA RESTRITA - MAIORES DE 18 ANOS
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 font-display">
          Controle de Idade Obrigatório
        </h2>

        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          A Velvet VIP contém vídeos verticais e conteúdos artísticos e sensuais destinados exclusivamente a adultos. É obrigatório confirmar sua maioridade legal antes de prosseguir.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Sua Data de Nascimento
            </label>
            <input
              id="age-gate-birthdate-input"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-2.5 bg-[#18181f] border border-zinc-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-[#18181f]/80 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
            <input
              id="age-gate-consent-checkbox"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-rose-600 bg-zinc-900 border-zinc-700 rounded focus:ring-rose-500"
            />
            <span className="text-xs text-zinc-300 leading-snug">
              Declaro sob as penas da lei que tenho <strong className="text-white">18 anos de idade ou mais</strong> e concordo em visualizar conteúdos destinados a adultos.
            </span>
          </label>

          <button
            id="age-gate-submit-button"
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar e Entrar na Plataforma
          </button>
        </form>

        <p className="mt-4 text-[11px] text-zinc-500">
          Em conformidade com as diretrizes legais e proteção de menores na internet.
        </p>
      </div>
    </div>
  );
};
