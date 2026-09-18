import React from 'react';
import { ShieldAlert, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AgeVerificationModal: React.FC = () => {
  const { hasConsented18Plus, confirmAgeVerification } = useAuth();
  if (hasConsented18Plus) return null;

  const leave = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.replace('about:blank');
  };

  return (
    <div id="age-verification-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div id="age-verification-card" className="w-full max-w-md bg-[#121216] border border-rose-950/60 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-950/50 border border-rose-600/30 flex items-center justify-center text-rose-500 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Você tem 18 anos ou mais?</h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          A Velvet VIP é destinada a maiores de 18 anos. Conteúdos gratuitos e mais leves podem ser assistidos sem criar uma conta após esta confirmação.
        </p>
        <button id="age-gate-submit-button" type="button" onClick={() => void confirmAgeVerification()}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Sim, tenho 18 anos ou mais
        </button>
        <button type="button" onClick={leave}
          className="w-full mt-3 py-3 px-4 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Não, sair
        </button>
        <p className="mt-4 text-[11px] text-zinc-500">
          Esta confirmação é uma declaração de maioridade, não substitui verificação de identidade quando ela for exigida para recursos restritos.
        </p>
      </div>
    </div>
  );
};
