import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from './authService';
import { apiClient } from './apiClient';
import { storageService, STORAGE_KEYS } from './storageService';
import {
  getRememberedUsername,
  readKeepAliveCredentials,
  saveKeepAliveCredentials,
  setRememberMePreference,
} from './auth/sessionKeepAliveStorage';

describe('authService (v2 — Autenticación real, perfil /me, clave, keep-alive y logout)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
    storageService.saveConfig({ baseUrl: 'http://localhost:3000' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login() persiste sesión normalizando token o accessToken con skipAuth y credentials include', async () => {
    const spy = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        token: 'jwt.token.xyz',
        user: { id: 'usr-1', username: 'admin', role: 'ADMIN' as const },
      })
      .mockResolvedValueOnce({
        accessToken: 'jwt-real-123',
        user: { id: 'u2', username: 'ana', role: 'MANAGER' as const },
      });

    const s1 = await authService.login({ username: 'admin', password: 'password123' });
    expect(s1.token).toBe('jwt.token.xyz');
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isAdmin()).toBe(true);

    const s2 = await authService.login({ username: 'ana', password: 'secret' });
    expect(spy).toHaveBeenLastCalledWith(
      '/api/v1/auth/login',
      { username: 'ana', password: 'secret' },
      expect.objectContaining({ skipAuth: true, credentials: 'include' })
    );
    expect(s2.token).toBe('jwt-real-123');
    expect(authService.isAdmin()).toBe(false);
  });

  it('getMe() sincroniza perfil del usuario en sesión y createUser() llama a POST /api/v1/users', async () => {
    storageService.saveSession({
      token: 'jwt.token.abc',
      user: { id: 'usr-1', username: 'admin', role: 'ADMIN' },
    });

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      user: {
        id: 'usr-1-db',
        username: 'admin_real',
        role: 'ADMIN' as const,
        isActive: true,
      },
    });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      user: { id: 'new-1', username: 'col', role: 'COLLABORATOR' as const, isActive: true },
    });

    await authService.getMe();
    expect(getSpy).toHaveBeenCalledWith('/api/v1/auth/me');
    expect(storageService.getSession()?.user.username).toBe('admin_real');

    const created = await authService.createUser({
      username: 'col',
      password: 'secretPassword',
      role: 'COLLABORATOR',
    });
    expect(postSpy).toHaveBeenCalledWith('/api/v1/users', {
      username: 'col',
      password: 'secretPassword',
      role: 'COLLABORATOR',
    });
    expect(created.user.id).toBe('new-1');
  });

  it('changePassword() llama a PATCH /api/v1/auth/password', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      message: 'Contraseña actualizada exitosamente',
    });

    const res = await authService.changePassword({
      currentPassword: 'oldSecretPassword123',
      newPassword: 'newSecretPassword456',
    });

    expect(patchSpy).toHaveBeenCalledWith('/api/v1/auth/password', {
      currentPassword: 'oldSecretPassword123',
      newPassword: 'newSecretPassword456',
    });
    expect(res.message).toBe('Contraseña actualizada exitosamente');
  });

  it('logout() limpia sesión, notifica POST /api/v1/auth/logout con Bearer y tolera fallos de red', async () => {
    storageService.saveSession({
      token: 'real-jwt-999',
      user: { id: 'u1', username: 'admin', role: 'ADMIN' },
    });
    const postSpy = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce({ message: 'Logged out' })
      .mockRejectedValueOnce(new Error('Network offline'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await authService.logout();
    expect(postSpy).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      undefined,
      expect.objectContaining({
        credentials: 'include',
        headers: { Authorization: 'Bearer real-jwt-999' },
      })
    );
    expect(authService.getSession()).toBeNull();

    storageService.saveSession({
      token: 'valid.token',
      user: { id: 'u2', username: 'collab', role: 'COLLABORATOR' },
    });
    await authService.logout();
    expect(authService.getSession()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('respeta "Mantener sesión iniciada" (localStorage vs sessionStorage) y limpia credenciales al hacer logout()', async () => {
    vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        token: 'jwt-keep-alive',
        user: { id: 'u1', username: 'juan', role: 'ADMIN' as const },
      })
      .mockResolvedValueOnce({
        message: 'Logged out',
      })
      .mockResolvedValueOnce({
        token: 'jwt-tab-only',
        user: { id: 'u2', username: 'temporal', role: 'COLLABORATOR' as const },
      });

    // 1. Con rememberMe = true (por defecto): guarda en localStorage y conserva respaldo keep-alive
    setRememberMePreference(true);
    await authService.login({ username: 'juan', password: 'MiClaveSegura!' });
    expect(getRememberedUsername()).toBe('juan');
    expect(readKeepAliveCredentials()).toEqual({ username: 'juan', password: 'MiClaveSegura!' });
    expect(localStorage.getItem(STORAGE_KEYS.AUTH_SESSION)).not.toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.AUTH_SESSION)).toBeNull();

    // Al cerrar sesión manualmente, destruye tanto la sesión como el respaldo keep-alive
    await authService.logout();
    expect(readKeepAliveCredentials()).toBeNull();
    expect(authService.getSession()).toBeNull();

    // 2. Con rememberMe = false: guarda la sesión solo en sessionStorage y no guarda keep-alive
    setRememberMePreference(false);
    await authService.login({ username: 'temporal', password: 'ClaveTemp!' });
    expect(readKeepAliveCredentials()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.AUTH_SESSION)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.AUTH_SESSION)).not.toBeNull();
    expect(authService.getSession()?.user.username).toBe('temporal');
  });

  it('re-autentica silenciosamente contra /api/v1/auth/login cuando /auth/refresh falla a los 15 min por cookie bloqueada', async () => {
    setRememberMePreference(true);
    saveKeepAliveCredentials({ username: 'juan', password: 'MiClaveSegura!' });
    storageService.saveSession({
      token: 'expired.15min.token',
      user: { id: 'u1', username: 'juan', role: 'ADMIN' },
    });

    let foldersAttempt = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/folders')) {
        foldersAttempt += 1;
        const authHeader = (init?.headers as Headers | undefined)?.get('Authorization');
        if (foldersAttempt === 1 || authHeader !== 'Bearer silent.renewed.jwt') {
          return {
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ code: 'UNAUTHORIZED', detail: 'Access token expired' }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ folders: [{ id: 'f-1', name: 'General' }] }),
        };
      }
      if (url.includes('/api/v1/auth/refresh')) {
        // Simula cookie HttpOnly bloqueada en HTTP/Brave -> 401
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ code: 'NO_REFRESH_COOKIE', detail: 'Missing refresh token' }),
        };
      }
      if (url.includes('/api/v1/auth/login')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            token: 'silent.renewed.jwt',
            user: { id: 'u1', username: 'juan', role: 'ADMIN' },
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.get<{ folders: Array<{ id: string }> }>('/api/v1/folders');
    expect(res.folders).toHaveLength(1);
    expect(storageService.getToken()).toBe('silent.renewed.jwt');
  });
});
