import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Crown, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../lib/supabase';

interface AuthModalProps { isOpen: boolean; onClose: () => void; onOpenTerms?: () => void; defaultMode?: 'login' | 'register'; }

export const AuthModalV2: React.FC<AuthModalProps> = ({ isOpen, onClose, onOpenTerms, defaultMode = 'login' }) => {
  const { login, register, requestPasswordReset, switchUser, allUsers } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [name, setName] = useState(''); const [username, setUsername] = useState(''); const [birthDate, setBirthDate] = useState(''); const [role, setRole] = useState<'user' | 'creator'>('user');
  const [confirm, setConfirm] = useState(''); const [showPassword, setShowPassword] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [accepted, setAccepted] = useState(false);
  if (!isOpen) return null;
  const age = birthDate ? Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000) : 0;

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try { if (!(await login(email.trim(), password))) { setError('E-mail ou senha inválidos.'); return; } setSuccess('Login efetuado com sucesso.'); setTimeout(onClose, 500); }
    catch (err: any) { setError(err?.message || 'Não foi possível entrar.'); }
    finally { setLoading(false); }
  };
  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (age < 18) return setError('Você precisa ter 18 anos ou mais.');
    if (!accepted) return setError('Aceite os termos e a política de privacidade.');
    if (password.length < 8) return setError('Use uma senha com pelo menos 8 caracteres.');
    if (password !== confirm) return setError('As senhas não coincidem.');
    setLoading(true);
    try { const created = await register(name.trim(), username.trim(), email.trim(), birthDate, role, password); if (!created) { setSuccess('Conta criada. Confirme seu e-mail e depois entre com sua senha.'); setMode('login'); setPassword(''); setConfirm(''); } else { setSuccess('Conta criada e login efetuado com sucesso.'); setTimeout(onClose, 900); } }
    catch (err: any) { setError(err?.message || 'Não foi possível criar a conta.'); }
    finally { setLoading(false); }
  };
  const forgotPassword = async () => {
    setError(''); setSuccess('');
    if (!email.trim()) return setError('Informe seu e-mail primeiro.');
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSuccess('Se o e-mail estiver cadastrado, enviaremos um link seguro para redefinir a senha.');
    } catch {
      setSuccess('Se o e-mail estiver cadastrado, enviaremos um link seguro para redefinir a senha.');
    } finally { setLoading(false); }
  };
  const quickLogin = (wanted: 'creator' | 'user' | 'admin') => { const u = allUsers.find(x => x.role === wanted); if (u) { switchUser(u.id); setSuccess(`Demonstração: ${u.name}`); setTimeout(onClose, 500); } };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
    <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-[#121217] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
      <div className="mb-6 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white"><Sparkles className="h-6 w-6" /></div><h2 className="text-xl font-black text-white">VELVET <span className="text-rose-500">VIP</span> <span className="text-[10px] text-rose-400">18+</span></h2><p className="mt-1 text-xs text-zinc-400">Autenticação segura e controle de idade.</p></div>
      <div className="mb-5 grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1"><button onClick={() => setMode('login')} className={`rounded-lg py-2 text-xs font-bold ${mode === 'login' ? 'bg-rose-600 text-white' : 'text-zinc-400'}`}>Entrar</button><button onClick={() => setMode('register')} className={`rounded-lg py-2 text-xs font-bold ${mode === 'register' ? 'bg-rose-600 text-white' : 'text-zinc-400'}`}>Criar conta</button></div>
      {error && <div className="mb-4 flex gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
      {success && <div className="mb-4 flex gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-3 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" />{success}</div>}
      {mode === 'login' ? <form onSubmit={submitLogin} className="space-y-4">
        <label className="block text-xs text-zinc-300">E-mail<input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoComplete="email" className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white outline-none focus:border-rose-500" /></label>
        <label className="block text-xs text-zinc-300">Senha<div className="relative mt-1.5"><Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" /><input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} required autoComplete="current-password" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 pl-10 pr-10 text-sm text-white outline-none focus:border-rose-500" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-3 text-zinc-500">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
        <button type="button" onClick={forgotPassword} disabled={loading} className="w-full text-right text-[11px] text-zinc-400 hover:text-rose-300">Esqueci minha senha</button>
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 py-3 text-xs font-bold text-white disabled:opacity-50">{loading ? 'Entrando...' : 'Entrar na plataforma'} <ArrowRight className="h-4 w-4" /></button>
        {!isSupabaseConfigured && <div className="border-t border-zinc-800 pt-4"><p className="mb-2 text-center text-[11px] text-zinc-500">Modo demonstração local</p><div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => quickLogin('creator')} className="rounded-xl bg-zinc-900 p-2 text-[10px] text-amber-300"><Crown className="mx-auto mb-1 h-4 w-4" />Criador</button><button type="button" onClick={() => quickLogin('user')} className="rounded-xl bg-zinc-900 p-2 text-[10px] text-sky-300"><UserIcon className="mx-auto mb-1 h-4 w-4" />Membro</button><button type="button" onClick={() => quickLogin('admin')} className="rounded-xl bg-zinc-900 p-2 text-[10px] text-rose-300"><ShieldCheck className="mx-auto mb-1 h-4 w-4" />Admin</button></div></div>}
      </form> : <form onSubmit={submitRegister} className="space-y-3">
        <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setRole('user')} className={`rounded-xl border p-3 text-xs ${role === 'user' ? 'border-sky-500 bg-sky-950/40 text-sky-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}>Membro VIP</button><button type="button" onClick={() => setRole('creator')} className={`rounded-xl border p-3 text-xs ${role === 'creator' ? 'border-rose-500 bg-rose-950/40 text-rose-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}>Criador(a)</button></div>
        <label className="block text-xs text-zinc-300">Nome<input value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-white" /></label>
        <label className="block text-xs text-zinc-300">Usuário<input value={username} onChange={e => setUsername(e.target.value)} required pattern="[A-Za-z0-9_]{3,30}" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-white" /></label>
        <label className="block text-xs text-zinc-300">E-mail<input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-white" /></label>
        <label className="block text-xs text-zinc-300">Data de nascimento<input value={birthDate} onChange={e => setBirthDate(e.target.value)} type="date" required className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-white" /></label>
        <label className="block text-xs text-zinc-300">Senha <span className="text-zinc-500">— mínimo de 8 caracteres</span><div className="relative mt-1"><input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 pl-3 pr-10 text-sm text-white" /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-3 text-zinc-500 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{password && <span className={`mt-1.5 block text-[11px] font-semibold ${password.length < 8 ? 'text-rose-400' : password.length < 12 ? 'text-amber-400' : 'text-emerald-400'}`}>{password.length < 8 ? 'Fraca — use pelo menos 8 caracteres' : password.length < 12 ? 'Média' : 'Forte'}</span>}</label>
        <label className="block text-xs text-zinc-300">Confirmar senha<div className="relative mt-1"><input value={confirm} onChange={e => setConfirm(e.target.value)} type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 pl-3 pr-10 text-sm text-white" /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-3 text-zinc-500 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
        <label className="flex items-start gap-2 text-[11px] text-zinc-400"><input checked={accepted} onChange={e => setAccepted(e.target.checked)} type="checkbox" className="mt-0.5" />Aceito os termos de uso, a política de privacidade e o acesso restrito a maiores de 18 anos.</label>
        <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 py-3 text-xs font-bold text-white disabled:opacity-50">{loading ? 'Criando...' : 'Criar conta'}</button>
        {onOpenTerms && <button type="button" onClick={onOpenTerms} className="w-full text-[11px] text-zinc-500 underline">Ler termos e privacidade</button>}
      </form>}
    </div>
  </div>;
};
