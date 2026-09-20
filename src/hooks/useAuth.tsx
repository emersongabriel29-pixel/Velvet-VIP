import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { User, Creator, UserRole } from '../types';
import { dbService } from '../services/db';
import { isSupabaseConfigured, isDemoMode, supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: User;
  currentCreator?: Creator;
  isAuthenticated: boolean;
  canUseTestMode: boolean;
  isRolePreview: boolean;
  testRole: UserRole | null;
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
const TEST_ROLE_KEY = 'velvet_vip_admin_test_role';

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
  const demoMode = isDemoMode;
  const [currentUser, setCurrentUser] = useState<User>(() => demoMode ? dbService.getCurrentUser() : guestUser);
  const [currentCreator, setCurrentCreator] = useState<Creator | undefined>(() => demoMode ? dbService.getCreatorByUserId(dbService.getCurrentUser().id) : undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => demoMode);
  const [testRole, setTestRole] = useState<UserRole | null>(() => {
    if (demoMode) return null;
    const stored = sessionStorage.getItem(TEST_ROLE_KEY);
    return stored === 'user' || stored === 'creator' || stored === 'admin' ? stored : null;
  });
  const [hasConsented18Plus, setHasConsented18Plus] = useState<boolean>(() => localStorage.getItem(AGE_CONSENT_KEY) === 'true');
  const [allUsers, setAllUsers] = useState<User[]>(() => demoMode ? dbService.getAllUsers() : []);

  const profileRequest = useRef(0);
  const loadSupabaseProfile = async (userId: string, email?: string) => {
    if (!supabase) return null;
    const request = ++profileRequest.current;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error || !data) return null;
    const mapped = mapProfile(data, email || '');
    if (mapped.role !== 'admin') {
      sessionStorage.removeItem(TEST_ROLE_KEY);
      setTestRole(null);
    }
    if (supabase && data.platform_plan_id) {
      const { data: plan } = await supabase.from('platform_plans').select('slug').eq('id', data.platform_plan_id).maybeSingle();
      if (plan?.slug === 'gratis' || plan?.slug === 'plus' || plan?.slug === 'vip') mapped.platform_plan_slug = plan.slug;
    }
    const { data: creator } = await supabase.from('creators').select('*').eq('user_id', userId).maybeSingle();
    if (request !== profileRequest.current) return null;
    setCurrentUser(mapped);
    setIsAuthenticated(true);
    setCurrentCreator(creator || undefined);
    setHasConsented18Plus(localStorage.getItem(AGE_CONSENT_KEY) === 'true');
    return mapped;
  };

  useEffect(() => {
    if (demoMode) {
      const unsub = dbService.subscribe(() => {
        const u = dbService.getCurrentUser();
        setCurrentUser(u);
        setCurrentCreator(dbService.getCreatorByUserId(u.id));
        setAllUsers(dbService.getAllUsers());
      });
      return unsub;
    }

    if (!supabase) return;
    let mounted = true;
    const applySession = (session: { user: { id: string; email?: string } } | null) => {
      if (!mounted) return;
      ++profileRequest.current;
      if (session?.user) {
        // Leave the auth callback before performing additional Supabase requests.
        const revision = profileRequest.current;
        setTimeout(() => {
          if (mounted && revision === profileRequest.current) void loadSupabaseProfile(session.user.id, session.user.email || '');
        }, 0);
      } else { setIsAuthenticated(false); setCurrentUser(guestUser); setCurrentCreator(undefined); }
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));
    // INITIAL_SESSION is normally emitted by the listener. This also covers
    // clients that attach after storage restoration has already completed.
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    return () => { mounted = false; ++profileRequest.current; listener.subscription.unsubscribe(); };
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
    if (!data.user || !data.session) return null;
    return await loadSupabaseProfile(data.user.id, data.user.email || email);
  };

  const logout = async () => {
    if (demoMode) { dbService.setCurrentUser('user-002'); return; }
    if (supabase) await supabase.auth.signOut();
    sessionStorage.removeItem(TEST_ROLE_KEY);
    setTestRole(null);
    setCurrentUser(guestUser);
    setCurrentCreator(undefined);
    setIsAuthenticated(false);
  };

  const switchUserRole = (role: UserRole) => {
    if (demoMode) {
      const match = allUsers.find(u => u.role === role);
      if (match) dbService.setCurrentUser(match.id);
      return;
    }
    // Production role switching is an admin-only UI preview. The authenticated
    // account and its database permissions are deliberately never changed.
    if (currentUser.role !== 'admin') return;
    sessionStorage.setItem(TEST_ROLE_KEY, role);
    setTestRole(role);
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

  const canUseTestMode = demoMode || currentUser.role === 'admin';
  const isRolePreview = !demoMode && currentUser.role === 'admin' && testRole !== null && testRole !== 'admin';
  const visibleUser = useMemo(
    () => !demoMode && currentUser.role === 'admin' && testRole ? { ...currentUser, role: testRole } : currentUser,
    [currentUser, demoMode, testRole]
  );

  const value = useMemo(() => ({
    currentUser: visibleUser, currentCreator, isAuthenticated, canUseTestMode, isRolePreview, testRole,
    isAgeVerified: currentUser.age_verified && hasConsented18Plus,
    hasConsented18Plus, confirmAgeVerification, login, requestPasswordReset, updatePassword, register, logout, switchUserRole, switchUser,
    updateProfile, topUpWallet, allUsers
  }), [visibleUser, currentUser.age_verified, currentCreator, isAuthenticated, canUseTestMode, isRolePreview, testRole, hasConsented18Plus, allUsers]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
