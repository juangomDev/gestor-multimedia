import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('authService — v2 Real Authentication & Role Guards', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
  });

  it('login sends skipAuth + credentials include, normalizes accessToken, and persists session', async () => {
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      accessToken: 'jwt-real-123',
      user: { id: 'u1', username: 'ana', role: 'ADMIN' as const },
    });

    const session = await authService.login({ username: 'ana', password: 'secret' });

    expect(spy).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      { username: 'ana', password: 'secret' },
      expect.objectContaining({ skipAuth: true, credentials: 'include' })
    );
    expect(session.token).toBe('jwt-real-123');
    expect(storageService.getToken()).toBe('jwt-real-123');
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isAdmin()).toBe(true);
  });

  it('isAdmin returns false for MANAGER / COLLABORATOR and when unauthenticated', () => {
    expect(authService.isAdmin()).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);

    storageService.saveSession({
      token: 'jwt-manager',
      user: { id: 'm1', username: 'mgr', role: 'MANAGER' },
    });
    expect(authService.isAdmin()).toBe(false);
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('refresh supports both token and accessToken and preserves existing token if empty', async () => {
    storageService.saveSession({
      token: 'old-token',
      user: { id: 'u1', username: 'ana', role: 'COLLABORATOR' },
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({});
    await authService.refresh();
    expect(storageService.getToken()).toBe('old-token');

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ accessToken: 'rotated-jwt' });
    const refreshed = await authService.refresh();
    expect(refreshed.token).toBe('rotated-jwt');
    expect(storageService.getToken()).toBe('rotated-jwt');
  });

  it('logout clears session and notifies POST /api/v1/auth/logout with Bearer token', async () => {
    storageService.saveSession({
      token: 'real-jwt-999',
      user: { id: 'u1', username: 'admin', role: 'ADMIN' },
    });
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue({ message: 'Logged out' });

    await authService.logout();

    expect(spy).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      undefined,
      expect.objectContaining({
        credentials: 'include',
        headers: { Authorization: 'Bearer real-jwt-999' },
      })
    );
    expect(authService.getSession()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
