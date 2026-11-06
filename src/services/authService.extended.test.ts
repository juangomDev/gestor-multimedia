import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('authService — Extended (Módulo 18: sesión local, guards y casos borde)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('login sends skipAuth + credentials include and persists the session', async () => {
    const session = { token: 'jwt-123', user: { id: 'u1', username: 'ana', role: 'ADMIN' as const } };
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue(session);

    await authService.login({ username: 'ana', password: 'secret' });

    expect(spy).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      { username: 'ana', password: 'secret' },
      expect.objectContaining({ skipAuth: true, credentials: 'include' })
    );
    expect(storageService.getToken()).toBe('jwt-123');
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('loginAsLocalSession stores a local session without contacting the backend', () => {
    const spy = vi.spyOn(apiClient, 'post');
    authService.loginAsLocalSession({
      token: 'dev_jwt_admin_master_token',
      user: { id: 'local', username: 'admin', role: 'ADMIN' },
    });

    expect(spy).not.toHaveBeenCalled();
    expect(authService.getSession()?.user.username).toBe('admin');
    expect(authService.isAdmin()).toBe(true);
  });

  it('isAdmin returns false for MANAGER / COLLABORATOR and when unauthenticated', () => {
    expect(authService.isAdmin()).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);

    authService.loginAsLocalSession({
      token: 'mock-manager',
      user: { id: 'm1', username: 'mgr', role: 'MANAGER' },
    });
    expect(authService.isAdmin()).toBe(false);
  });

  it('refresh does not overwrite the stored token when the backend returns no token', async () => {
    authService.loginAsLocalSession({
      token: 'old-token',
      user: { id: 'u1', username: 'ana', role: 'COLLABORATOR' },
    });
    vi.spyOn(apiClient, 'post').mockResolvedValue({});

    await authService.refresh();
    expect(storageService.getToken()).toBe('old-token');
  });

  it('logout with a local/mock token clears the session without calling the backend', async () => {
    authService.loginAsLocalSession({
      token: 'dev_jwt_admin_master_token',
      user: { id: 'local', username: 'admin', role: 'ADMIN' },
    });
    const spy = vi.spyOn(apiClient, 'post');

    await authService.logout();

    expect(spy).not.toHaveBeenCalled();
    expect(authService.getSession()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});

