import React, { useState } from 'react';
import { X, Database, Copy, Check, ExternalLink, Terminal, Shield, CheckCircle2 } from 'lucide-react';
import { isSupabaseConfigured, checkSupabaseConnection } from '../../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_SCHEMA_SUMMARY = `-- ESQUEMA RELACIONAL COMPLETO POSTGRESQL / SUPABASE (VELVET VIP 18+)
-- 16 TABELAS COM ROW LEVEL SECURITY (RLS) E POLÍTICAS AUDITADAS:
-- 1. profiles (perfis de usuários, age verification, dados de consentimento 18+)
-- 2. creators (canais de criadores, taxas, dados bancários PIX, métricas)
-- 3. creator_plans (planos de assinatura básica, vip e exclusiva)
-- 4. videos (vídeos verticais 9:16, status de transcodificação, paywall)
-- 5. video_likes (curtidas com constraints de unicidade)
-- 6. comments (comentários aninhados e likes em comentários)
-- 7. favorites (vídeos salvos para assistir depois)
-- 8. follows (grafo social criador-seguidor)
-- 9. subscriptions (assinaturas recorrentes ativas e renovação)
-- 10. purchases (compras individuais de vídeos Pay-Per-View)
-- 11. transactions (log de pagamentos PIX e Cartão com split de 15% taxa)
-- 12. withdrawals (solicitações de saque PIX dos criadores)
-- 13. reports (sistema de moderação de denúncias de conteúdo)
-- 14. notifications (notificações em tempo real com websocket supabase)
-- 15. video_views (métricas de retenção e telemetria de visualizações)
-- 16. platform_settings (taxas globais e diretrizes de compliance)
-- STORAGE BUCKETS CONFIGURADOS:
-- - 'videos' (armazenamento de arquivos mp4/webm verticais)
-- - 'thumbnails' (telas e pôsteres públicos)
-- - 'avatars' (fotos de perfil e banners dos criadores)
-- O arquivo SQL completo está salvo em /supabase/schema.sql`;

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SUMMARY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await checkSupabaseConnection();
    setTesting(false);
    if (res.success) {
      setTestResult('Conexão ao Supabase estabelecida com sucesso!');
    } else {
      setTestResult(res.message);
    }
  };

  return (
    <div id="supabase-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div id="supabase-modal-card" className="w-full max-w-2xl bg-[#121216] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                Banco de Dados Supabase (PostgreSQL 16)
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isConfigured ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {isConfigured ? 'Conectado Live' : 'Modo Mock Ativo'}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                16 tabelas relacionais com RLS, storage buckets e banco reativo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status indicator */}
        <div className="p-4 rounded-2xl bg-[#16161d] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="text-zinc-300 font-semibold mb-0.5">Status da Conexão:</div>
            <p className="text-zinc-500 text-[11px]">
              {isConfigured
                ? 'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY detectadas.'
                : 'O backend não está configurado. Ative VITE_DEMO_MODE apenas para uma demonstração local explícita ou adicione as variáveis do Supabase.'}
            </p>
          </div>

          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 transition-colors cursor-pointer disabled:opacity-50"
          >
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>
        </div>

        {testResult && (
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}

        {/* SQL Schema Preview */}
        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Resumo do Arquivo /supabase/schema.sql</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 cursor-pointer font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Script SQL'}</span>
            </button>
          </div>

          <pre className="flex-1 overflow-y-auto p-4 bg-black/80 border border-zinc-800 rounded-2xl text-[11px] font-mono text-emerald-400/90 leading-relaxed no-scrollbar select-all">
            {SUPABASE_SCHEMA_SUMMARY}
          </pre>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-rose-500" />
            RLS (Row Level Security) protege todos os vídeos e dados financeiros
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
