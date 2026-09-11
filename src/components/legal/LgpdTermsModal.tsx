import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  Download,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Eye,
  Server,
  UserCheck
} from 'lucide-react';
import { dbService } from '../../services/db';
import { useAuth } from '../../hooks/useAuth';

interface LgpdTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LgpdTermsModal: React.FC<LgpdTermsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'lgpd' | 'terms' | 'security' | 'creator_contract'>('lgpd');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExportData = () => {
    const data = dbService.exportUserDataLGPD(currentUser.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `velvet_vip_meus_dados_lgpd_${currentUser.username}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#121217] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900/80 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5 shrink-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white font-display">
                Jurídico, LGPD & Cibersegurança
              </h2>
              <p className="text-xs text-zinc-400">
                Conformidade legal com a Lei Geral de Proteção de Dados (13.709/18) e Termos Contratuais 18+.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-3 border-b border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('lgpd')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'lgpd'
                  ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Privacidade & LGPD
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'terms'
                  ? 'bg-rose-950/70 border border-rose-500/50 text-rose-300'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Termos de Uso (18+)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('creator_contract')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'creator_contract'
                  ? 'bg-amber-950/70 border border-amber-500/50 text-amber-300'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Contrato do Criador
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-sky-950/70 border border-sky-500/50 text-sky-300'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cibersegurança
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto pr-1 space-y-4 text-xs text-zinc-300 leading-relaxed">
          {/* TAB 1: LGPD */}
          {activeTab === 'lgpd' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Política de Privacidade - Lei 13.709/2018 (LGPD)
                </h3>
                <p>
                  A plataforma <strong>Velvet VIP</strong> respeita integralmente a privacidade de seus usuários e criadores, adotando medidas técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs">1. Dados Coletados & Finalidade</h4>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                  <li><strong>Dados Cadastrais:</strong> Nome, e-mail, nome de usuário e data de nascimento para comprovação estrita da maioridade legal (18+).</li>
                  <li><strong>Dados Financeiros:</strong> Chaves PIX para repasse de comissões aos criadores e registros de faturas de compras efetuadas.</li>
                  <li><strong>Registros de Conexão:</strong> Endereço IP, data e hora de acesso em cumprimento ao Art. 15 do Marco Civil da Internet (Lei 12.965/14).</li>
                </ul>

                <h4 className="font-bold text-white text-xs">2. Direitos do Titular (Art. 18 da LGPD)</h4>
                <p className="text-zinc-400">
                  Você tem o direito de obter a qualquer momento: confirmação do tratamento, acesso aos dados, correção de dados incompletos, eliminação de dados tratados com consentimento e a portabilidade das informações.
                </p>

                {/* Self-service data export */}
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-emerald-300 text-xs">Baixar Cópia Integral dos Seus Dados</h5>
                    <p className="text-[11px] text-zinc-400">
                      Gera um arquivo legível por máquina (.json) com todas as suas informações salvas.
                    </p>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Meus Dados</span>
                  </button>
                </div>

                {downloadSuccess && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Arquivo de dados pessoais baixado com sucesso!
                  </p>
                )}

                <h4 className="font-bold text-white text-xs">3. Contato com o Encarregado de Dados (DPO)</h4>
                <p className="text-zinc-400">
                  Para exercer seus direitos ou tirar dúvidas sobre o tratamento de seus dados pessoais, contate nosso DPO através do e-mail: <strong className="text-white">dpo@velvetvip.com</strong>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Terms of Use */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-400" />
                  Termos Gerais de Uso & Acesso Restrito (18+)
                </h3>
                <p>
                  Estes Termos regulam as condições de utilização da plataforma Velvet VIP. Ao acessar o sistema, você declara sob as penalidades legais civis e penais ter atingido a maioridade de 18 anos.
                </p>
              </div>

              <div className="space-y-2.5 text-zinc-400">
                <h4 className="font-bold text-white text-xs">1. Proibição Absoluta de Menores</h4>
                <p>
                  É estritamente vedado o acesso, cadastro, visualização ou participação de qualquer pessoa física com idade inferior a 18 (dezoito) anos completos. Contas suspeitas são suspensas sumariamente para validação documental.
                </p>

                <h4 className="font-bold text-white text-xs">2. Propriedade Intelectual & Antipirataria</h4>
                <p>
                  Todo o conteúdo visual, mídias em vídeo e transmissões são de titularidade exclusiva dos criadores licenciados. É expressamente proibida a cópia, gravação de tela, redistribuição ou comercialização não autorizada de mídias, sujeitando os infratores a sanções cíveis e criminais (Art. 184 do Código Penal).
                </p>

                <h4 className="font-bold text-white text-xs">3. Política de Compras & Desbloqueios</h4>
                <p>
                  Os pagamentos efetuados para desbloqueio de vídeos (Pay-Per-View) ou assinaturas mensais concedem licença de acesso temporário ou permanente na biblioteca digital da conta do adquirente, sem direito a download externo para difusão pública.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Creator Contract */}
          {activeTab === 'creator_contract' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  Contrato de Licenciamento & Repasse de Criadores VIP
                </h3>
                <p>
                  Termos aplicáveis a todos os usuários cadastrados como Criadores de Conteúdo na plataforma Velvet VIP.
                </p>
              </div>

              <div className="space-y-2.5 text-zinc-400">
                <h4 className="font-bold text-white text-xs">1. Repasse Financeiro (85% para o Criador)</h4>
                <p>
                  O Criador recebe <strong>85% (oitenta e cinco por cento)</strong> do valor líquido de todas as assinaturas e vendas individuais (Pay-Per-View) de suas mídias. A plataforma retém uma taxa administrativa de <strong>15%</strong> para manutenção de infraestrutura, streaming e processamento bancário.
                </p>

                <h4 className="font-bold text-white text-xs">2. Saques via PIX</h4>
                <p>
                  Os saques podem ser solicitados a qualquer momento com saldo disponível mínimo de R$ 50,00, processados diretamente para a chave PIX do titular da conta bancária após validação cadastral.
                </p>

                <h4 className="font-bold text-white text-xs">3. Garantia de Idade e Consentimento dos Participantes</h4>
                <p>
                  O Criador assegura e garante que todas as pessoas participantes de seus vídeos possuem mais de 18 anos na data da gravação e forneceram autorização expressa de imagem, mantendo documentação de conformidade (2257 compliance) disponível a qualquer requisição da moderação da plataforma ou de autoridades judiciais.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Cyber Security */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-sky-400" />
                  Arquitetura de Segurança Cibernética
                </h3>
                <p>
                  Medidas de proteção implementadas para assegurar a confidencialidade, integridade e disponibilidade dos dados e das mídias.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    Row Level Security (RLS)
                  </h5>
                  <p className="text-[11px] text-zinc-400">
                    O banco de dados PostgreSQL impõe políticas RLS em nível de linha: nenhum usuário ou criador consegue ler ou modificar registros que não pertençam à sua própria chave de autenticação.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-sky-400" />
                    Criptografia TLS 1.3
                  </h5>
                  <p className="text-[11px] text-zinc-400">
                    Todas as comunicações entre o navegador e os servidores utilizam TLS 1.3 com cifras seguras, impedindo interceptação de credenciais e ataques Man-In-The-Middle.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    Prevenção contra Hotlinking
                  </h5>
                  <p className="text-[11px] text-zinc-400">
                    Vídeos pagos utilizam links assinados efêmeros e desfoque nativo com validação server-side antes da entrega dos bytes de alta resolução.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Fila de Moderação 24/7
                  </h5>
                  <p className="text-[11px] text-zinc-400">
                    Sistema de denúncias automatizado e fila de supervisão com capacidade de bloqueio e exclusão de vídeos instantânea pelo Super Admin.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500">
            Versão de Conformidade: 2026.2 - Velvet VIP Legal
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
