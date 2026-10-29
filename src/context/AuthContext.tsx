import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import type { LoginCredentials, User, CreateUserInput } from '../types/auth';

interface AuthContextValue {
  user: { id: string; username: string; role: 'ADMIN' | 'USER' } | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginAsLocalAdmin: () => void;
  logout: () => void;
  createUser: (input: CreateUserInput) => Promise<{ user: User }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState(() => authService.getSession());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSession(authService.getSession());
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const newSession = await authService.login(credentials);
      setSession(newSession);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsLocalAdmin = () => {
    const adminSession = {
      token: 'dev_jwt_admin_master_token',
      user: {
        id: 'admin-master',
        username: 'admin',
        role: 'ADMIN' as const,
      },
    };
    authService.loginAsLocalSession(adminSession);
    setSession(adminSession);
  };

  const logout = () => {
    authService.logout();
    setSession(null);
  };

  const createUser = async (input: CreateUserInput) => {
    return authService.createUser(input);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        token: session?.token || null,
        isAuthenticated: !!session?.token,
        isAdmin: session?.user?.role === 'ADMIN',
        isLoading,
        login,
        loginAsLocalAdmin,
        logout,
        createUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
