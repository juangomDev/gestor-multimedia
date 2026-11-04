import React, { useState } from 'react';
import { authService } from '../services/authService';
import { AuthContext } from './authContextDef';
import type { LoginCredentials, CreateUserInput } from '../types/auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState(() => authService.getSession());
  const [isLoading, setIsLoading] = useState(false);

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
