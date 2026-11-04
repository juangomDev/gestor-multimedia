import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('authService - Extended Session & Password Management', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('getMe calls GET /api/v1/auth/me and updates session user in storage', async () => {
    storageService.saveSession({
      token: 'jwt.token.abc',
      user: { id: 'usr-1', username: 'admin', role: 'ADMIN' },
    });

    const mockProfile = {
      user: {
        id: 'usr-1-db',
        username: 'admin_real',
        role: 'ADMIN' as const,
        isActive: true,
        createdById: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockProfile);

    const res = await authService.getMe();

    expect(getSpy).toHaveBeenCalledWith('/api/v1/auth/me');
    expect(res).toEqual(mockProfile);
    expect(storageService.getSession()?.user.username).toBe('admin_real');
    expect(storageService.getSession()?.user.isActive).toBe(true);
  });

  it('changePassword calls PATCH /api/v1/auth/password with payload', async () => {
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

  it('refresh calls POST /api/v1/auth/refresh and updates token and user', async () => {
    storageService.saveSession({
      token: 'old.expired.jwt',
      user: { id: 'usr-1', username: 'manager_1', role: 'MANAGER' },
    });

    const mockRefreshRes = {
      token: 'brand.new.refreshed.jwt',
      user: {
        id: 'usr-1',
        username: 'manager_1',
        role: 'MANAGER' as const,
      },
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockRefreshRes);

    const res = await authService.refresh();

    expect(postSpy).toHaveBeenCalledWith('/api/v1/auth/refresh', undefined, {
      skipAuth: true,
      credentials: 'include',
    });
    expect(res.token).toBe('brand.new.refreshed.jwt');
    expect(storageService.getToken()).toBe('brand.new.refreshed.jwt');
  });

  it('logout calls POST /api/v1/auth/logout with credentials include and clears session', async () => {
    storageService.saveSession({
      token: 'valid.token',
      user: { id: 'usr-1', username: 'collab', role: 'COLLABORATOR' },
    });

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      message: 'Sesión cerrada exitosamente',
    });

    await authService.logout();

    expect(postSpy).toHaveBeenCalledWith('/api/v1/auth/logout', undefined, {
      credentials: 'include',
      headers: {
        Authorization: 'Bearer valid.token',
      },
    });
    expect(storageService.getSession()).toBeNull();
  });

  it('logout clears session even if backend call fails or network is offline', async () => {
    storageService.saveSession({
      token: 'valid.token',
      user: { id: 'usr-1', username: 'collab', role: 'COLLABORATOR' },
    });

    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Network offline'));

    await authService.logout();

    expect(storageService.getSession()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
