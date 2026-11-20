import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('authService (v2 — Autenticación real, perfil /me, clave y logout)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
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
});
