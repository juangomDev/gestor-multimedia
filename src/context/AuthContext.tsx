import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { apiClient, ApiError } from '../services/apiClient';
import { storageService, STORAGE_KEYS } from '../services/storageService';
import { AuthContext } from './authContextDef';
import type { LoginCredentials } from '../types/auth';

/**
 * Proveedor de autenticación real contra `monolith-backend`.
 * Al iniciar, valida la sesión persistida con `GET /api/v1/auth/me` (rotando el token vía
 * `POST /api/v1/auth/refresh` de forma transparente si el access token expiró), purga la caché
 * de TanStack Query ante cualquier cambio de sesión/cuenta y sincroniza cierres entre pestañas.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useContext(QueryClientContext);
  const authEpochRef = useRef(0);
  const [session, setSession] = useState(() => authService.getSession());
  const [isCheckingSession, setIsCheckingSession] = useState(() => Boolean(authService.getSession()?.token));

  /**
   * Sincroniza el perfil actual desde `GET /api/v1/auth/me` y actualiza la sesión en memoria.
   */
  const refreshProfile = useCallback(async () => {
    if (!authService.isAuthenticated()) return;
    const epoch = authEpochRef.current;
    const res = await authService.getMe();
    if (authEpochRef.current !== epoch) return;
    const freshSession = storageService.getSession();
    if (res?.user) {
      setSession((prev) => {
        const base = freshSession ?? prev;
        if (!base) return null;
        return {
          ...base,
          user: {
            ...base.user,
            ...res.user,
          },
        };
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribeUnauthorized = apiClient.onUnauthorized(() => {
      authEpochRef.current += 1;
      queryClient?.clear();
      setSession(null);
      setIsCheckingSession(false);
    });

    const unsubscribeTokenRefreshed = apiClient.onTokenRefreshed((newToken) => {
      setSession((prev) => (prev ? { ...prev, token: newToken } : null));
    });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEYS.AUTH_SESSION && event.key !== null) return;
      authEpochRef.current += 1;
      storageService.resetCache();
      queryClient?.clear();
      setSession(authService.getSession());
      setIsCheckingSession(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    const cleanupListeners = () => {
      unsubscribeUnauthorized();
      unsubscribeTokenRefreshed();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
    };

    const initialToken = authService.getSession()?.token ?? null;
    if (!initialToken) {
      return cleanupListeners;
    }

    let cancelled = false;
    const mountEpoch = authEpochRef.current;

    authService
      .getMe()
      .then((res) => {
        if (cancelled || authEpochRef.current !== mountEpoch) return;
        const freshSession = authService.getSession();
        if (res?.user) {
          setSession((prev) => {
            const base = freshSession ?? prev;
            if (!base) return null;
            return {
              ...base,
              user: {
                ...base.user,
                ...res.user,
              },
            };
          });
        }
      })
      .catch((err: unknown) => {
        if (cancelled || authEpochRef.current !== mountEpoch) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          storageService.saveSession(null);
          queryClient?.clear();
          setSession(null);
        }
      })
      .finally(() => {
        if (!cancelled && authEpochRef.current === mountEpoch) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      cancelled = true;
      cleanupListeners();
    };
  }, [queryClient]);

  /**
   * Inicia sesión con credenciales reales (`POST /api/v1/auth/login`), purga caché previa
   * y enriquece con `/auth/me` antes de publicar la sesión autenticada.
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      authEpochRef.current += 1;
      const loginEpoch = authEpochRef.current;

      const newSession = await authService.login(credentials);
      if (authEpochRef.current !== loginEpoch) return;

      queryClient?.clear();

      let finalSession = newSession;
      if (authService.isAuthenticated()) {
        try {
          const me = await authService.getMe();
          if (authEpochRef.current !== loginEpoch) return;
          if (me?.user) {
            const freshSession = storageService.getSession() ?? newSession;
            finalSession = {
              ...freshSession,
              user: {
                ...freshSession.user,
                ...me.user,
              },
            };
          }
        } catch {
          // Mantener la sesión recién emitida por /login si /me falla transitoriamente
        }
      }

      if (authEpochRef.current !== loginEpoch) return;
      setSession(finalSession);
      setIsCheckingSession(false);
    },
    [queryClient]
  );

  /**
   * Cierra sesión en el backend (`POST /api/v1/auth/logout`), limpia la sesión local
   * y purga por completo la caché de TanStack Query para evitar fugas entre cuentas.
   */
  const logout = useCallback(async () => {
    authEpochRef.current += 1;
    queryClient?.clear();
    setSession(null);
    setIsCheckingSession(false);
    await authService.logout();
    queryClient?.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user: session?.user || null,
      token: session?.token || null,
      isAuthenticated: Boolean(session?.token),
      isAdmin: session?.user?.role === 'ADMIN',
      isManager: session?.user?.role === 'MANAGER',
      isCheckingSession,
      login,
      logout,
      refreshProfile,
    }),
    [session, isCheckingSession, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
