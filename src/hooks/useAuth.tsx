import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User, Creator, UserRole } from '../types';
import { dbService } from '../services/db';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: User;
  currentCreator?: Creator;
  isAuthenticated: boolean;
  isAgeVerified: boolean;
  hasConsented18Plus: boolean;
  confirmAgeVerification: () => Promise<void>;
  login: (email: string, pass: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  register: (name: string, username: string, email: string, birthDate: string, role?: 'user' | 'creator', password?: string) => Promise<User | null>;
  logout: () => Promise<void>;
  switchUserRole: (role: UserRole) => void;
  switchUser: (userId: string) => void;
  updateProfile: (partial: Partial<User>) => Promise<void>;
  topUpWallet: (amount: number) => void;
  allUsers: User[];
}

const AuthContext = createContext<AuthContextType | null>(null);
const AGE_CONSENT_KEY = 'velvet_vip_age_consent_confirmed';

const guestUser: User = {
  id: '', email: '', username: '', name: 'Visitante', avatar_url: '', bio: '', role: 'user',
  birth_date: '', age_verified: false, wallet_balance: 0, created_at: new Date(0).toISOString()
};

function mapProfile(profile: any, email = ''): User {
  return {
    id: profile.id,
    email,
    username: profile.username,
    name: profile.name,
    avatar_url: profile.avatar_url || '',
    bio: profile.bio || '',
    role: profile.role || 'user',
    birth_date: profile.birth_date,
    age_verified: Boolean(profile.age_verified),
    is_blocked: Boolean(profile.is_blocked),
    is_suspended: Boolean(profile.is_suspended),
    wallet_balance: Number(profile.wallet_balance || 0),
    platform_plan_slug: profile.platform_plan_slug || profile.platform_plan?.slug || 'gratis',
    created_at: profile.created_at,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const demoMode = !isSupabaseConfigured;
  const [currentUser, setCurrentUser] = useState<User>(() => demoMode ? dbService.getCurrentUser() : guestUser);
  const [currentCreator, setCurrentCreator] = useState<Creator | undefined>(() => demoMode ? dbService.getCreatorByUserId(dbService.getCurrentUser().id) : undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => demoMode);
  const [hasConsented18Plus, setHasConsented18Plus] = useState<boolean>(() => localStorage.getItem(AGE_CONSENT_KEY) === 'true');
  const [allUsers, setAllUsers] = useState<User[]>(() => demoMode ? dbService.getAllUsers() : []);

  const loadSupabaseProfile = async (userId: string, email?: string) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error || !data) return null;
    const mapped = mapProfile(data, email || '');
    if (supabase && data.platform_plan_id) {
      const { data: plan } = await supabase.from('platform_plans').select('slug').eq('id', data.platform_plan_id).maybeSingle();
      if (plan?.slug === 'gratis' || plan?.slug === 'plus' || plan?.slug === 'vip') mapped.platform_plan_slug = plan.slug;
    }
    setCurrentUser(mapped);
    setIsAuthenticated(true);
    const { data: creator } = await supabase.from('creators').select('*').eq('user_id', userId).maybeSingle();
    setCurrentCreator(creator || undefined);
    setHasConsented18Plus(localStorage.getItem(AGE_CONSENT_KEY) === 'true');
    return mapped;
  };

  useEffect(() => {
    if (demoMode || !supabase) {
      const unsub = dbService.subscribe(() => {
        const u = dbService.getCurrentUser();
        setCurrentUser(u);
        setCurrentCreator(dbService.getCreatorByUserId(u.id));
        setAllUsers(dbService.getAllUsers());
      });
      return unsub;
    }

    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (data.session?.user) await loadSupabaseProfile(data.session.user.id, data.session.user.email || '');
      else { setIsAuthenticated(false); setCurrentUser(guestUser); }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) await loadSupabaseProfile(session.user.id, session.user.email || '');
      else { setIsAuthenticated(false); setCurrentUser(guestUser); setCurrentCreator(undefined); }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [demoMode]);

  const confirmAgeVerification = async () => {
    // This is only an 18+ visitor declaration stored on this device.
    // It must never mutate the server-side age_verified/KYC state.
    localStorage.setItem(AGE_CONSENT_KEY, 'true');
    setHasConsented18Plus(true);
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    if (demoMode) {
      const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!found) return false;
      dbService.setCurrentUser(found.id);
      return true;
    }
    if (!supabase) return false;
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (error || !data.user) return false;
    return Boolean(await loadSupabaseProfile(data.user.id, data.user.email || email));
  };

  const requestPasswordReset = async (email: string) => {
    if (demoMode) throw new Error('Recuperação de senha exige Supabase configurado.');
    if (!supabase) throw new Error('Supabase não configurado.');
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    if (demoMode || !supabase) throw new Error('Supabase não configurado.');
    if (password.length < 8) throw new Error('Use uma senha com pelo menos 8 caracteres.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const register = async (name: string, username: string, email: string, birthDate: string, role: 'user' | 'creator' = 'user', password = ''): Promise<User | null> => {
    if (demoMode) {
      const user = dbService.registerUser(name, username, email, birthDate, role);
      localStorage.setItem(AGE_CONSENT_KEY, 'true');
      setHasConsented18Plus(true);
      return user;
    }
    if (!supabase || !password) throw new Error('Senha obrigatória.');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { name: name.trim(), username: username.trim(), birth_date: birthDate, requested_role: role } }
    });
    if (error) throw error;
    localStorage.setItem(AGE_CONSENT_KEY, 'true');
    setHasConsented18Plus(true);
    if (!data.user) return null;
    return await loadSupabaseProfile(data.user.id, data.user.email || email);
  };

  const logout = async () => {
    if (demoMode) { dbService.setCurrentUser('user-002'); return; }
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(guestUser);
    setCurrentCreator(undefined);
    setIsAuthenticated(false);
  };

  const switchUserRole = (role: UserRole) => {
    if (demoMode) {
      const match = allUsers.find(u => u.role === role);
      if (match) dbService.setCurrentUser(match.id);
    }
  };

  const switchUser = (userId: string) => { if (demoMode) dbService.setCurrentUser(userId); };

  const updateProfile = async (partial: Partial<User>) => {
    if (demoMode) {
      dbService.updateUser(currentUser.id, partial);
      if (currentCreator && partial.name) dbService.updateCreator(currentCreator.id, { display_name: partial.name, bio: partial.bio || currentCreator.bio, avatar_url: partial.avatar_url || currentCreator.avatar_url });
      return;
    }
    if (!supabase || !currentUser.id) return;
    const allowed: Record<string, unknown> = {};
    for (const key of ['username', 'name', 'avatar_url', 'bio'] as const) if (partial[key] !== undefined) allowed[key] = partial[key];
    const { error } = await supabase.from('profiles').update(allowed).eq('id', currentUser.id);
    if (error) throw error;
    await loadSupabaseProfile(currentUser.id, currentUser.email);
  };

  const topUpWallet = (_amount: number) => {
    if (demoMode) console.warn('topUpWallet is available only for demo mode. Real balances must be credited by a verified payment webhook.');
  };

  const value = useMemo(() => ({
    currentUser, currentCreator, isAuthenticated, isAgeVerified: currentUser.age_verified && hasConsented18Plus,
    hasConsented18Plus, confirmAgeVerification, login, requestPasswordReset, updatePassword, register, logout, switchUserRole, switchUser,
    updateProfile, topUpWallet, allUsers
  }), [currentUser, currentCreator, isAuthenticated, hasConsented18Plus, allUsers]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
