import React, { useEffect, useState } from 'react';
import { Check, Gift, Crown, Megaphone, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
import { PlatformPlan } from '../../types';
import { dbService } from '../../services/db';
import { isDemoMode, isSupabaseConfigured, supabase } from '../../lib/supabase';
import { startCheckout } from '../../services/payments';
import { useAuth } from '../../hooks/useAuth';

export const MonetizationPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [selected, setSelected] = useState(currentUser.platform_plan_slug ?? 'gratis');
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.from('platform_plans').select('*').eq('is_active', true).order('monthly_price');
          if (error) throw error;
          if (mounted && data) setPlans(data as PlatformPlan[]);
        } else if (isDemoMode && mounted) {
          setPlans(dbService.getPlatformPlans().map(p => ({ ...p, created_at: new Date().toISOString() })));
        } else {
          throw new Error('Backend de produção indisponível.');
        }
      } catch (error: any) {
        if (mounted) setFeedback(error.message || 'Não foi possível carregar os planos.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const checkout = async (plan: PlatformPlan) => {
    if (plan.slug === 'gratis') return;
    setCheckoutLoading(plan.slug);
    setFeedback('');
    try {
      const { checkoutUrl } = await startCheckout({ kind: 'platform_plan', planId: plan.id });
      window.location.assign(checkoutUrl);
    } catch (error: any) {
      setFeedback(error.message || 'Pagamento não disponível.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const iconFor = (slug: string) => slug === 'vip' ? <Crown className="h-5 w-5 text-amber-400" /> : slug === 'plus' ? <Gift className="h-5 w-5 text-rose-400" /> : <Megaphone className="h-5 w-5 text-zinc-400" />;

  return <div className="min-h-screen bg-[#09090b] px-4 pb-28 pt-24 text-white">
    <div className="mx-auto max-w-5xl">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</button>
      <div className="mb-10 text-center"><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Velvet VIP</p><h1 className="text-3xl font-black sm:text-4xl">Escolha sua experiência</h1><p className="mt-3 text-zinc-400">O plano geral remove anúncios; a assinatura de um criador libera somente o conteúdo dele.</p></div>
      {feedback && <div role="alert" className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{feedback}</div>}
      {loading ? <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-rose-400" /></div> : <div className="grid gap-4 md:grid-cols-3">{plans.map(plan => <article key={plan.id} className={`rounded-3xl border p-6 transition ${selected === plan.slug ? 'border-rose-500 bg-rose-950/20 ring-2 ring-rose-500/20' : 'border-zinc-800 bg-zinc-900/60'}`}>
        <button onClick={() => setSelected(plan.slug)} className="w-full text-left"><div className="mb-5 flex items-center justify-between"><span className="text-lg font-bold">{plan.name}</span>{iconFor(plan.slug)}</div><div className="mb-5 text-2xl font-black">{plan.monthly_price === 0 ? 'R$ 0' : `R$ ${Number(plan.monthly_price).toFixed(2).replace('.', ',')}/mês`}</div><ul className="space-y-3 text-sm text-zinc-300">{plan.benefits.map(item => <li key={item} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-400" />{item}</li>)}</ul></button>
        {plan.slug !== 'gratis' && <button disabled={checkoutLoading === plan.slug} onClick={() => checkout(plan)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold hover:bg-rose-500 disabled:opacity-50">{checkoutLoading === plan.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}Assinar com pagamento seguro</button>}
      </article>)}</div>}
      <div className="mt-10 grid gap-5 md:grid-cols-2"><div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"><h2 className="mb-2 text-xl font-bold">Apoie um criador</h2><p className="text-sm text-zinc-400">Gorjetas serão processadas pelo checkout seguro quando o gateway estiver configurado. O criador recebe 90% somente após pagamento confirmado.</p></div><div className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-6"><h2 className="mb-2 text-xl font-bold">Divisão transparente</h2><p className="text-sm text-zinc-400">Assinaturas e vendas: 85% para o criador. Gorjetas: 90%. A plataforma não promete ganhos sem receita confirmada.</p></div></div>
      {selected === 'gratis' && <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-5 text-center text-sm text-zinc-400"><Megaphone className="mx-auto mb-2 h-5 w-5 text-zinc-500" />Anúncios aparecem somente para usuários sem plano pago.</div>}
    </div>
  </div>;
};
