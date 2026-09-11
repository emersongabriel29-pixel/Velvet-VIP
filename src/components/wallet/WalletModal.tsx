import React, { useState } from 'react';
import { X, Wallet, QrCode, CreditCard, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import confetti from 'canvas-confetti';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, topUpWallet } = useAuth();
  const [amount, setAmount] = useState<number>(50);
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const presetAmounts = [20, 50, 100, 250];

  const handleDeposit = () => {
    setLoading(true);
    setTimeout(() => {
      topUpWallet(amount);
      setLoading(false);
      setSuccess(true);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    }, 1000);
  };

  return (
    <div id="wallet-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div id="wallet-modal-card" className="w-full max-w-md bg-[#121216] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-display">Carteira Velvet</h3>
              <p className="text-xs text-zinc-400">Adicione saldo para compras imediatas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-[#141419] border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 block">Saldo Atual Disponível</span>
            <span className="text-2xl font-black text-white font-display">
              R$ {currentUser.wallet_balance.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <Sparkles className="w-6 h-6 text-amber-400" />
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-lg font-bold text-white font-display">Recarga Confirmada!</h4>
            <p className="text-xs text-zinc-400">
              R$ {amount.toFixed(2).replace('.', ',')} adicionados com sucesso à sua carteira.
            </p>
          </div>
        ) : (
          <>
            {/* Quick Amounts */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Selecione o valor da recarga:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {presetAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt)}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      amount === amt
                        ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    R$ {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Forma de Recarga:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('pix')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    method === 'pix'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>PIX Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    method === 'card'
                      ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão de Crédito</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Transação criptografada de ponta a ponta.</span>
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-amber-500 hover:brightness-110 active:scale-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-950/40 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Processando pagamento...' : `Adicionar R$ ${amount.toFixed(2).replace('.', ',')}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
