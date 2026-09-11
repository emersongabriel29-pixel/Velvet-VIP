import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Creator, UserRole } from '../types';
import { dbService } from '../services/db';

interface AuthContextType {
  currentUser: User;
  currentCreator?: Creator;
  isAuthenticated: boolean;
  isAgeVerified: boolean;
  hasConsented18Plus: boolean;
  confirmAgeVerification: (birthDate?: string) => void;
  login: (email: string, pass: string) => boolean;
  register: (name: string, username: string, email: string, birthDate: string, role?: 'user' | 'creator') => User;
  logout: () => void;
  switchUserRole: (role: UserRole) => void;
  switchUser: (userId: string) => void;
  updateProfile: (partial: Partial<User>) => void;
  topUpWallet: (amount: number) => void;
  allUsers: User[];
}

const AuthContext = createContext<AuthContextType | null>(null);

const AGE_CONSENT_KEY = 'velvet_vip_age_consent_confirmed';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => dbService.getCurrentUser());
  const [currentCreator, setCurrentCreator] = useState<Creator | undefined>(() => 
    dbService.getCreatorByUserId(dbService.getCurrentUser().id)
  );
  const [hasConsented18Plus, setHasConsented18Plus] = useState<boolean>(() => {
    return localStorage.getItem(AGE_CONSENT_KEY) === 'true';
  });
  const [allUsers, setAllUsers] = useState<User[]>(() => dbService.getAllUsers());

  useEffect(() => {
    const unsub = dbService.subscribe(() => {
      const u = dbService.getCurrentUser();
      setCurrentUser(u);
      setCurrentCreator(dbService.getCreatorByUserId(u.id));
      setAllUsers(dbService.getAllUsers());
    });
    return unsub;
  }, []);

  const confirmAgeVerification = (birthDate?: string) => {
    localStorage.setItem(AGE_CONSENT_KEY, 'true');
    setHasConsented18Plus(true);
    if (birthDate) {
      dbService.updateUser(currentUser.id, { birth_date: birthDate, age_verified: true });
    } else {
      dbService.updateUser(currentUser.id, { age_verified: true });
    }
  };

  const login = (email: string, _pass: string): boolean => {
    const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      dbService.setCurrentUser(found.id);
      return true;
    }
    // If not found, create a demo user with that email
    const username = email.split('@')[0];
    const newUser = dbService.registerUser(username, username, email, '1998-01-01', 'user');
    dbService.setCurrentUser(newUser.id);
    return true;
  };

  const register = (name: string, username: string, email: string, birthDate: string, role: 'user' | 'creator' = 'user') => {
    const user = dbService.registerUser(name, username, email, birthDate, role);
    localStorage.setItem(AGE_CONSENT_KEY, 'true');
    setHasConsented18Plus(true);
    return user;
  };

  const logout = () => {
    // Switch to default viewer
    dbService.setCurrentUser('user-002');
  };

  const switchUserRole = (role: UserRole) => {
    const match = allUsers.find(u => u.role === role);
    if (match) {
      dbService.setCurrentUser(match.id);
    } else {
      dbService.updateUser(currentUser.id, { role });
    }
  };

  const switchUser = (userId: string) => {
    dbService.setCurrentUser(userId);
  };

  const updateProfile = (partial: Partial<User>) => {
    dbService.updateUser(currentUser.id, partial);
    if (currentCreator && partial.name) {
      dbService.updateCreator(currentCreator.id, {
        display_name: partial.name,
        bio: partial.bio || currentCreator.bio,
        avatar_url: partial.avatar_url || currentCreator.avatar_url
      });
    }
  };

  const topUpWallet = (amount: number) => {
    dbService.updateUser(currentUser.id, {
      wallet_balance: currentUser.wallet_balance + amount
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentCreator,
        isAuthenticated: true,
        isAgeVerified: currentUser.age_verified && hasConsented18Plus,
        hasConsented18Plus,
        confirmAgeVerification,
        login,
        register,
        logout,
        switchUserRole,
        switchUser,
        updateProfile,
        topUpWallet,
        allUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
