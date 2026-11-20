import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services/authService';
import { apiClient, ApiError } from '../services/apiClient';
import { storageService } from '../services/storageService';
import { AuthContext } from './authContextDef';
import type { LoginCredentials } from '../types/auth';

/**
 * Proveedor de autenticación real contra `monolith-backend`.
 * Al iniciar, valida la sesión persistida con `GET /api/v1/auth/me` (rotando el token vía
 * `POST /api/v1/auth/refresh` de forma transparente si el access token expiró) y limpia
 * la sesión si el servidor la rechaza.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState(() => authService.getSession());
  const [isCheckingSession, setIsCheckingSession] = useState(() => Boolean(authService.getSession()?.token));

  /**
   * Sincroniza el perfil actual desde `GET /api/v1/auth/me` y actualiza la sesión en memoria.
   */
  const refreshProfile = useCallback(async () => {
    if (!authService.isAuthenticated()) return;
    const res = await authService.getMe();
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
    const unsubscribe = apiClient.onUnauthorized(() => {
      setSession(null);
      setIsCheckingSession(false);
    });

    const initialToken = authService.getSession()?.token ?? null;
    if (!initialToken) {
      return unsubscribe;
    }

    let cancelled = false;

    authService
      .getMe()
      .then((res) => {
        if (cancelled) return;
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
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          storageService.saveSession(null);
          setSession(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  /**
   * Inicia sesión con credenciales reales (`POST /api/v1/auth/login`) y sincroniza `/auth/me`.
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    const newSession = await authService.login(credentials);
    setSession(newSession);
    try {
      await refreshProfile();
    } catch {
      // Mantener la sesión recién emitida por /login si /me falla transitoriamente
    }
  }, [refreshProfile]);

  /**
   * Cierra sesión en el backend (`POST /api/v1/auth/logout`) y limpia el estado local.
   */
  const logout = useCallback(async () => {
    setSession(null);
    await authService.logout();
  }, []);

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
