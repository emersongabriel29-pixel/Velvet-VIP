import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type CheckoutKind = 'platform_plan' | 'creator_plan' | 'pay_per_view' | 'tip';

export async function startCheckout(input: {
  kind: CheckoutKind;
  planId?: string;
  creatorId?: string;
  videoId?: string;
  amount?: number;
  message?: string;
}): Promise<{ checkoutUrl: string }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Pagamento indisponível: configure o Supabase e publique a Edge Function de checkout.');
  }

  const { data, error } = await supabase.functions.invoke('create-checkout', { body: input });
  if (error) throw new Error(error.message || 'Não foi possível iniciar o pagamento.');
  if (!data?.checkoutUrl) throw new Error('O gateway não retornou uma URL de pagamento.');
  return { checkoutUrl: data.checkoutUrl };
}
