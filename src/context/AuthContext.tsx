import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/inventory';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  signup: (userData: { name: string; email: string; password: string; role?: string; department?: string }) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; otpPreview?: string }>;
  resetPassword: (email: string, otp: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check local storage for persistent session
    const storedUser = localStorage.getItem('stocksense_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('stocksense_user');
      }
    } else {
      // Auto-fetch default profile if present
      api.auth.getMe()
        .then(res => {
          if (res?.user) {
            setUser(res.user);
            localStorage.setItem('stocksense_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login({ email, password: pass });
    setUser(res.user);
    localStorage.setItem('stocksense_user', JSON.stringify(res.user));
    if (res.token) {
      localStorage.setItem('stocksense_token', res.token);
    }
  };

  const demoLogin = async () => {
    await login('alex@stocksense.io', 'stocksense123');
  };

  const signup = async (userData: { name: string; email: string; password: string; role?: string; department?: string }) => {
    const res = await api.auth.signup(userData);
    setUser(res.user);
    localStorage.setItem('stocksense_user', JSON.stringify(res.user));
    if (res.token) {
      localStorage.setItem('stocksense_token', res.token);
    }
  };

  const forgotPassword = async (email: string) => {
    return await api.auth.forgotPassword(email);
  };

  const resetPassword = async (email: string, otp: string, pass: string) => {
    await api.auth.resetPassword({ email, otp, newPassword: pass });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('stocksense_user');
    localStorage.removeItem('stocksense_token');
  };

  const updateUser = (u: User) => {
    setUser(u);
    localStorage.setItem('stocksense_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        demoLogin,
        signup,
        forgotPassword,
        resetPassword,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
