import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Crown,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTerms?: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onOpenTerms,
  defaultMode = 'login'
}) => {
  const { login, register, switchUser, allUsers } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form states
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regRole, setRegRole] = useState<'user' | 'creator'>('user');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const calculateAge = (birthDateStr: string): number => {
    if (!birthDateStr) return 0;
    const today = new Date();
    const birth = new Date(birthDateStr);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const currentAge = regBirthDate ? calculateAge(regBirthDate) : null;
  const isUnderage = currentAge !== null && currentAge < 18;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!loginEmail.trim()) {
      setErrorMsg('Informe o e-mail ou nome de usuário.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Informe sua senha.');
      return;
    }

    const success = login(loginEmail.trim(), loginPassword);
    if (success) {
      setSuccessMsg('Login efetuado com sucesso!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } else {
      setErrorMsg('Credenciais não localizadas.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regBirthDate) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    if (isUnderage) {
      setErrorMsg('Acesso estritamente restrito: Você precisa ter pelo menos 18 anos completos.');
      return;
    }

    if (!acceptedTerms) {
      setErrorMsg('Você precisa aceitar os Termos Contratuais e a Política de Privacidade LGPD.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    try {
      register(regName.trim(), regUsername.trim(), regEmail.trim(), regBirthDate, regRole);
      setSuccessMsg('Conta criada com sucesso! Bem-vindo(a) ao Velvet VIP.');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg('Ocorreu um erro ao criar a conta.');
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    const match = allUsers.find(u => u.role === role);
    if (match) {
      switchUser(match.id);
      setSuccessMsg(`Conectado como ${match.name} (${role})`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#121217] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900/80 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white shadow-lg shadow-rose-950/50 mb-3">
            <Sparkles className="w-6 h-6 fill-white" />
          </div>
          <h2 className="text-xl font-black text-white font-display tracking-tight flex items-center justify-center gap-2">
            VELVET <span className="text-rose-500">VIP</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              18+
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'login'
              ? 'Acesse sua conta segura com criptografia ponta a ponta'
              : 'Cadastre-se na plataforma exclusiva de criadores VIP'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                E-mail ou Usuário
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                />
                <span>Lembrar neste navegador</span>
              </label>
              <span className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer">
                Esqueceu a senha?
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Entrar na Plataforma</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Login for Testing */}
            <div className="pt-4 border-t border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 block text-center mb-2.5">
                Ou acesse com 1 clique (Modo de Demonstração):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('creator')}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-amber-300 hover:border-amber-500/40 transition-colors cursor-pointer flex flex-col items-center gap-1"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Criadora VIP</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('user')}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-sky-300 hover:border-sky-500/40 transition-colors cursor-pointer flex flex-col items-center gap-1"
                >
                  <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Membro Comum</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-rose-300 hover:border-rose-500/40 transition-colors cursor-pointer flex flex-col items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  <span>Admin</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Account Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Tipo de Conta:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegRole('user')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs transition-all cursor-pointer ${
                    regRole === 'user'
                      ? 'bg-sky-950/40 border-sky-500 text-sky-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Membro VIP</span>
                  <span className="text-[10px] opacity-70">Assinar & Desbloquear</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegRole('creator')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs transition-all cursor-pointer ${
                    regRole === 'creator'
                      ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  <span>Criador(a) VIP</span>
                  <span className="text-[10px] opacity-70">Publicar & Lucrar 85%</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Seu nome oficial"
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nome de Usuário (@handle) *
              </label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="ex: leticia_vip"
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                E-mail *
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            {/* Birth date with age verification check */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-300">
                  Data de Nascimento (Verificação 18+) *
                </label>
                {currentAge !== null && (
                  <span className={`text-[11px] font-bold ${isUnderage ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {currentAge} anos {isUnderage ? '(Menor de 18)' : '(Maior de 18)'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Calendar className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={regBirthDate}
                  onChange={(e) => setRegBirthDate(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2 bg-zinc-900 border rounded-xl text-xs text-white focus:outline-none ${
                    isUnderage ? 'border-rose-500 bg-rose-950/20' : 'border-zinc-700 focus:border-rose-500'
                  }`}
                  required
                />
              </div>
              {isUnderage && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Proibido o cadastro de menores de 18 anos nesta plataforma.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Senha *
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mín. 6 dígitos"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Confirmar Senha *
                </label>
                <input
                  type="password"
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>

            {/* Terms and LGPD checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500 w-4 h-4 shrink-0"
                  required
                />
                <span className="leading-snug text-[11px]">
                  Declaro sob as penas da lei que tenho <strong>mais de 18 anos</strong> e concordo com os{' '}
                  <button
                    type="button"
                    onClick={onOpenTerms}
                    className="text-rose-400 underline hover:text-rose-300 cursor-pointer"
                  >
                    Termos Contratuais de Uso
                  </button>{' '}
                  e com o tratamento de dados pessoais conforme a{' '}
                  <button
                    type="button"
                    onClick={onOpenTerms}
                    className="text-emerald-400 underline hover:text-emerald-300 cursor-pointer"
                  >
                    Política de Privacidade (LGPD)
                  </button>.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isUnderage}
              className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                isUnderage
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-950/40 cursor-pointer'
              }`}
            >
              <span>Concluir Cadastro Seguro (18+)</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
