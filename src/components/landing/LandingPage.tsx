import React, { useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  Play,
  Crown,
  DollarSign,
  Lock,
  ChevronRight,
  ChevronDown,
  Film,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenUpload: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onOpenUpload }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Como funciona o controle de idade 18+ na plataforma?',
      a: 'Todos os usuários passam por um gate estrito de confirmação de maioridade legal e concordância com os Termos de Uso antes de acessar qualquer conteúdo da plataforma.',
    },
    {
      q: 'Qual é a divisão de ganhos para os criadores?',
      a: 'A Velvet VIP repassa 85% do valor líquido das assinaturas mensais e vendas avulsas de vídeos (PPV) diretamente para o criador, com saques automatizados via PIX.',
    },
    {
      q: 'Como os vídeos verticais são protegidos?',
      a: 'A plataforma conta com arquitetura de Row Level Security (RLS) no banco de dados e URLs temporárias criptografadas para evitar downloads ou reproduções não autorizadas de conteúdos exclusivos.',
    },
    {
      q: 'Posso publicar vídeos como criador imediatamente?',
      a: 'Qualquer usuário maior de idade pode solicitar o modo criador, mas precisa concluir a verificação de identidade, aceitar as regras de consentimento e aguardar a aprovação antes de publicar.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-16 pb-20 px-4 sm:px-6 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-12 sm:py-20 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5 fill-rose-400" />
          <span>PLATAFORMA PREMIUM DE VÍDEOS VERTICAIS 18+</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-display max-w-3xl mx-auto leading-tight mb-6">
          A Experiência Definitiva em Vídeos Verticais <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400">VIP</span>
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
          Navegue por um feed infinito em tela cheia, assine criadores exclusivos e monetize seus próprios vídeos verticais com a mais alta tecnologia e discrição.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onEnterApp}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:brightness-110 active:scale-95 text-white font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-rose-950/60 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Acessar Feed Vertical Agora</span>
          </button>

          <button
            onClick={() => {
              onEnterApp();
              onOpenUpload();
            }}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Tornar-se Criador VIP</span>
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid sm:grid-cols-3 gap-4 my-12">
        <div className="p-6 rounded-3xl bg-[#121216] border border-zinc-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-rose-500 flex items-center justify-center">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white font-display">Feed Vertical 9:16</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Interface fluida inspirada nos melhores apps de vídeos curtos, com reprodução instantânea, toque duplo para curtir e comentários ao vivo.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[#121216] border border-zinc-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-950/50 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white font-display">Monetização de Elite</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Planos de assinatura mensal recorrente, vendas avulsas Pay-Per-View (PPV) e saques instantâneos via chave PIX para criadores.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[#121216] border border-zinc-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white font-display">Segurança & Moderação</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Controle de idade obrigatório 18+, proteção de privacidade de ponta a ponta, canal direto de denúncias e moderação ativa.
          </p>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="my-16 max-w-2xl mx-auto space-y-3">
        <h3 className="text-xl font-bold text-center text-white font-display mb-6">
          Perguntas Frequentes
        </h3>
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-[#121216] border border-zinc-800 overflow-hidden"
          >
            <button
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-zinc-200 hover:text-white cursor-pointer"
            >
              <span>{faq.q}</span>
              {openFaq === idx ? (
                <ChevronDown className="w-4 h-4 text-rose-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {openFaq === idx && (
              <div className="px-4 pb-4 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Regulatory Footer Disclaimer */}
      <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 text-center space-y-2 text-zinc-500 text-xs">
        <div className="flex items-center justify-center gap-1.5 text-rose-500 font-bold text-xs">
          <ShieldAlert className="w-4 h-4" />
          <span>AVISO LEGAL • CONTEÚDO RESTRITO A MAIORES DE 18 ANOS</span>
        </div>
        <p className="max-w-xl mx-auto text-[11px] leading-relaxed">
          O acesso a este site é proibido para menores de 18 anos. Todos os modelos e criadores que aparecem na Velvet VIP confirmaram sua maioridade legal antes da publicação dos vídeos.
        </p>
        <p className="text-[10px] text-zinc-600">
          © {new Date().getFullYear()} Velvet VIP. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};
