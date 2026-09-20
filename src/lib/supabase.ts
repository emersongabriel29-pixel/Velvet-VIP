/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = String((import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
// New Supabase projects should use a publishable key in browser clients. Keep
// the legacy anon variable as a compatibility fallback for existing deploys.
const supabasePublishableKey = String(
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  '',
).trim();
const explicitDemoMode = String((import.meta as any).env?.VITE_DEMO_MODE || '').toLowerCase() === 'true';
const productionBuild = Boolean((import.meta as any).env?.PROD);

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabasePublishableKey &&
  !supabaseUrl.includes('your-project') && 
  !supabasePublishableKey.includes('your-publishable-key') &&
  !supabasePublishableKey.includes('your-anon-key')
);

export const isDemoMode = !isSupabaseConfigured && explicitDemoMode;

// Production is fail-closed: missing backend configuration must never silently
// fall back to local demo data. Demo mode has to be explicitly enabled.
if (productionBuild && !isSupabaseConfigured && !explicitDemoMode) {
  throw new Error('Velvet VIP production configuration missing: Supabase is required.');
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

export async function checkSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente.',
    };
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      return { success: false, message: `Erro ao conectar: ${error.message}` };
    }
    return { success: true, message: 'Conexão com o Supabase estabelecida com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Falha na requisição: ${err.message || 'Desconhecido'}` };
  }
}
