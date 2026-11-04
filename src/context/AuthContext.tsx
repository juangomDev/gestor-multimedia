import React, { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import { AuthContext } from './authContextDef';
import type { LoginCredentials, CreateUserInput } from '../types/auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState(() => authService.getSession());
  const [isLoading, setIsLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!authService.isAuthenticated()) return;
    try {
      const res = await authService.getMe();
      if (res?.user) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                user: {
                  ...prev.user,
                  ...res.user,
                },
              }
            : null
        );
      }
    } catch (err) {
      // In offline/mock mode or non-200, keep current cached session
      console.warn('Could not synchronize profile with server:', err);
    }
  }, []);

  useEffect(() => {
    // Escuchar eventos de sesión revocada por el interceptor de apiClient
    const unsubscribe = apiClient.onUnauthorized(() => {
      setSession(null);
    });

    // Sincronizar datos reales del usuario (GET /api/v1/auth/me) al iniciar si hay token
    let isCancelled = false;
    const isMockOrDev =
      session?.token?.startsWith('mock-') || session?.token?.startsWith('dev_');
    if (session?.token && !isMockOrDev) {
      authService
        .getMe()
        .then((res) => {
          if (!isCancelled && res?.user) {
            setSession((prev) =>
              prev ? { ...prev, user: { ...prev.user, ...res.user } } : null
            );
          }
        })
        .catch((err) => {
          console.warn('Could not synchronize profile with server:', err);
        });
    }

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [session?.token]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const newSession = await authService.login(credentials);
      setSession(newSession);
      // Tras login exitoso, sincronizar datos frescos del perfil
      await refreshProfile();
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
        isActive: true,
      },
    };
    authService.loginAsLocalSession(adminSession);
    setSession(adminSession);
  };

  const logout = async () => {
    setSession(null);
    await authService.logout();
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
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
