import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('login stores session and returns UserSession', async () => {
    const mockSession = {
      token: 'jwt.token.xyz',
      user: { id: 'usr-1', username: 'admin', role: 'ADMIN' as const },
    };

    vi.spyOn(apiClient, 'post').mockResolvedValue(mockSession);

    const session = await authService.login({ username: 'admin', password: 'password123' });

    expect(session).toEqual(mockSession);
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isAdmin()).toBe(true);
    expect(storageService.getToken()).toBe('jwt.token.xyz');
  });

  it('logout removes session', async () => {
    storageService.saveSession({
      token: 'token',
      user: { id: '1', username: 'user', role: 'COLLABORATOR' },
    });

    vi.spyOn(apiClient, 'post').mockResolvedValue({ message: 'Sesión cerrada exitosamente' });

    expect(authService.isAuthenticated()).toBe(true);
    await authService.logout();
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getSession()).toBeNull();
  });

  it('createUser calls POST /api/v1/users', async () => {
    const mockCreated = {
      user: {
        id: 'new-user-1',
        username: 'colaborador',
        role: 'COLLABORATOR' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockCreated);

    const result = await authService.createUser({
      username: 'colaborador',
      password: 'secretPassword',
      role: 'COLLABORATOR',
    });

    expect(result).toEqual(mockCreated);
    expect(postSpy).toHaveBeenCalledWith('/api/v1/users', {
      username: 'colaborador',
      password: 'secretPassword',
      role: 'COLLABORATOR',
    });
  });
});
