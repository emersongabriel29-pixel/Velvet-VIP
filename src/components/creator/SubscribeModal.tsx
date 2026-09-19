import React, { useState } from 'react';
import { X, Crown, Check, Sparkles, QrCode, CreditCard, Wallet, ShieldCheck } from 'lucide-react';
import { Creator, Video } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { startCheckout } from '../../services/payments';

interface SubscribeModalProps {
  creator: Creator;
  video?: Video;
  mode?: 'subscribe' | 'ppv';
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({
  creator,
  video,
  mode = 'subscribe',
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'subscribe' | 'ppv'>(video && mode === 'ppv' ? 'ppv' : 'subscribe');
  const [selectedPlanTier, setSelectedPlanTier] = useState<'basic' | 'vip' | 'exclusive'>('vip');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'wallet'>('pix');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [checkoutError,setCheckoutError]=useState('');

  if (!isOpen) return null;

  const basicPrice = creator.subscription_price_basic || 29.90;
  const vipPrice = creator.subscription_price_vip || 59.90;
  const exclusivePrice = 99.90;
  const ppvPrice = video?.premium_price || 19.90;

  const plans = [
    {
      tier: 'basic' as const,
      name: 'Plano Básico',
      price: basicPrice,
      benefits: [
        'Acesso a vídeos com tag Básica',
        'Comentários destacados',
        'Selo de membro no perfil',
      ],
    },
    {
      tier: 'vip' as const,
      name: 'Plano VIP Gold',
      price: vipPrice,
      popular: true,
      benefits: [
        'Acesso TOTAL a todos os vídeos verticais',
        'Vídeos sem censura em 4K',
        'Prioridade no chat e pedidos diretos',
        'Acesso antecipado a novos lançamentos',
      ],
    },
    {
      tier: 'exclusive' as const,
      name: 'Plano Exclusivo VIP',
      price: exclusivePrice,
      benefits: [
        'Tudo do Plano VIP Gold',
        'Acesso à área restrita de ensaios completos',
        'Mensagens diretas com o criador',
        '1 conteúdo sob demanda por mês',
      ],
    },
  ];

  const handleCheckout = async () => {
    setCheckoutError('');
    if (!isSupabaseConfigured || !supabase) { setCheckoutError('Pagamento real indisponível: Supabase não configurado.'); return; }
    if (paymentMethod === 'wallet') { setCheckoutError('Pagamento com saldo ainda não está habilitado para este checkout.'); return; }
    setProcessing(true);
    try {
      if (activeTab === 'ppv' && video) {
        const checkout=await startCheckout({kind:'pay_per_view',videoId:video.id});
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      const {data:plan,error}=await supabase.from('creator_plans').select('id').eq('creator_id',creator.id).eq('tier',selectedPlanTier).eq('billing_period','monthly').eq('is_active',true).limit(1).maybeSingle();
      if(error || !plan) throw new Error('Plano selecionado não está cadastrado ou está inativo.');
      const checkout=await startCheckout({kind:'creator_plan',planId:plan.id});
      window.location.assign(checkout.checkoutUrl);
    } catch(e:any) { setCheckoutError(e?.message || 'Não foi possível iniciar o pagamento.'); setProcessing(false); }
  };

  return (
    <div id="subscribe-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div id="subscribe-modal-container" className="w-full max-w-lg bg-[#121216] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="relative p-5 border-b border-zinc-800 bg-[#16161d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={creator.avatar_url}
                alt={creator.display_name}
                className="w-11 h-11 rounded-full object-cover border-2 border-rose-500"
                referrerPolicy="no-referrer"
              />
              <Crown className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-1 font-display">
                {creator.display_name}
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </h3>
              <p className="text-xs text-zinc-400">@{creator.handle} • Clube VIP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: Assinatura vs Compra Individual */}
        {video && (
          <div className="flex border-b border-zinc-800 bg-zinc-900/60 p-1">
            <button
              onClick={() => setActiveTab('subscribe')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'subscribe'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Assinar Criador (Acesso Ilimitado)
            </button>
            <button
              onClick={() => setActiveTab('ppv')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'ppv'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Comprar Apenas Este Vídeo (PPV)
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {completed ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h4 className="text-xl font-bold text-white font-display">Acesso Liberado com Sucesso!</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {activeTab === 'subscribe'
                  ? `Parabéns! Você agora é assinante oficial de ${creator.display_name}. Aproveite todos os vídeos exclusivos.`
                  : `Vídeo desbloqueado com sucesso! Já está disponível no seu feed e na sua biblioteca Minhas Compras.`}
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'subscribe' ? (
                /* Plans List */
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-zinc-300">Escolha o seu plano de assinatura mensal:</div>
                  <div className="grid gap-2.5">
                    {plans.map((p) => {
                      const selected = selectedPlanTier === p.tier;
                      return (
                        <div
                          key={p.tier}
                          onClick={() => setSelectedPlanTier(p.tier)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                            selected
                              ? 'bg-gradient-to-r from-rose-950/40 to-amber-950/20 border-rose-500 ring-1 ring-rose-500/40'
                              : 'bg-[#16161c] border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {p.popular && (
                            <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-[9px] uppercase tracking-wider shadow">
                              Mais Escolhido
                            </span>
                          )}

                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
                                {p.name}
                                {p.tier === 'vip' && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                              </h4>
                              <p className="text-[11px] text-zinc-400">Cobrança mensal recorrente</p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-black text-white">
                                R$ {p.price.toFixed(2).replace('.', ',')}
                              </span>
                              <span className="text-[10px] text-zinc-400 block">/mês</span>
                            </div>
                          </div>

                          <ul className="space-y-1 pt-1 border-t border-zinc-800/60">
                            {p.benefits.map((b, i) => (
                              <li key={i} className="text-xs text-zinc-300 flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* PPV Video Purchase Details */
                video && (
                  <div className="p-4 rounded-2xl bg-[#16161c] border border-zinc-800 space-y-3">
                    <div className="flex gap-3">
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-20 h-28 object-cover rounded-xl border border-zinc-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <span className="text-[10px] uppercase font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          Vídeo Premium Avulso
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1 leading-snug">{video.title}</h4>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{video.description}</p>
                        <div className="mt-2 text-rose-400 font-extrabold text-base">
                          R$ {ppvPrice.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-2">
                      Acesso vitalício garantido: este conteúdo ficará disponível permanentemente na sua conta em <strong>Minhas Compras</strong>.
                    </p>
                  </div>
                )
              )}

              {checkoutError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">{checkoutError}</div>}

              {/* Payment Methods */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-300">Método de Pagamento:</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span>PIX Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                      paymentMethod === 'credit_card'
                        ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Cartão de Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                      paymentMethod === 'wallet'
                        ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                    <span>Saldo Velvet</span>
                  </button>
                </div>

                {paymentMethod === 'pix' && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span>Você será direcionado ao checkout seguro do Mercado Pago. O acesso só é liberado após confirmação do pagamento.</span>
                  </div>
                )}

                {paymentMethod === 'wallet' && (
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs flex items-center justify-between">
                    <span className="text-zinc-400">Seu saldo em carteira:</span>
                    <span className="font-bold text-amber-400">
                      R$ {currentUser.wallet_balance.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
              </div>

              {/* Security guarantee */}
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Checkout processado pelo provedor de pagamento. O acesso só é liberado após confirmação do webhook.</span>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer CTA */}
        {!completed && (
          <div className="p-4 border-t border-zinc-800 bg-[#16161d] flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Total a pagar:</span>
              <span className="text-lg font-black text-white font-display">
                R${' '}
                {activeTab === 'subscribe'
                  ? (selectedPlanTier === 'vip' ? vipPrice : selectedPlanTier === 'exclusive' ? exclusivePrice : basicPrice).toFixed(2).replace('.', ',')
                  : ppvPrice.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <button
              id="confirm-checkout-btn"
              onClick={handleCheckout}
              disabled={processing}
              className="px-6 py-3 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:brightness-110 active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-rose-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Crown className="w-4 h-4 fill-white" />
                  <span>{activeTab === 'subscribe' ? 'Confirmar Assinatura VIP' : 'Desbloquear Vídeo'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
