import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersService } from './usersService';
import { apiClient } from './apiClient';
import { authService } from './authService';
import { storageService } from './storageService';

describe('UsersService (RBAC PostgreSQL User Administration)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('listUsers() calls GET /api/v1/users, normalizes records and caches in storageService', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      users: [
        {
          id: 'mgr-1',
          username: 'manager_alpha',
          role: 'MANAGER',
          isActive: true,
          createdById: 'admin-1',
          createdAt: '2026-01-10T12:00:00.000Z',
        },
        {
          id: 'col-1',
          username: 'collab_beta',
          role: 'COLLABORATOR',
          isActive: false,
          createdById: 'mgr-1',
          createdAt: '2026-01-11T12:00:00.000Z',
        },
      ],
    });

    const users = await usersService.listUsers();

    expect(getSpy).toHaveBeenCalledWith('/api/v1/users');
    expect(users).toHaveLength(2);
    expect(users[0]).toEqual({
      id: 'mgr-1',
      username: 'manager_alpha',
      role: 'MANAGER',
      isActive: true,
      createdById: 'admin-1',
      createdAt: '2026-01-10T12:00:00.000Z',
    });
    expect(users[1].isActive).toBe(false);
    expect(storageService.getCreatedUsers()).toHaveLength(2);
  });

  it('createUser() delegates to authService.createUser and stores the normalized user', async () => {
    const createSpy = vi.spyOn(authService, 'createUser').mockResolvedValue({
      user: {
        id: 'mgr-2',
        username: 'nuevo_manager',
        role: 'MANAGER',
        isActive: true,
        createdById: 'admin-1',
        createdAt: '2026-02-01T10:00:00.000Z',
      },
    });

    const result = await usersService.createUser({
      username: 'nuevo_manager',
      password: 'Password123!',
      role: 'MANAGER',
    });

    expect(createSpy).toHaveBeenCalledWith({
      username: 'nuevo_manager',
      password: 'Password123!',
      role: 'MANAGER',
    });
    expect(result.user.role).toBe('MANAGER');
    expect(storageService.getCreatedUsers()[0]?.username).toBe('nuevo_manager');
  });

  it('updateUserStatus() calls PATCH /api/v1/users/:id/status and updates cached status', async () => {
    storageService.saveCreatedUsers([
      {
        id: 'col-99',
        username: 'usuario_activo',
        role: 'COLLABORATOR',
        isActive: true,
      },
    ]);

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      user: {
        id: 'col-99',
        username: 'usuario_activo',
        role: 'COLLABORATOR',
        isActive: false,
        createdById: 'admin-1',
        createdAt: '2026-02-02T00:00:00.000Z',
      },
    });

    const res = await usersService.updateUserStatus('col-99', false);

    expect(patchSpy).toHaveBeenCalledWith('/api/v1/users/col-99/status', {
      isActive: false,
    });
    expect(res.user.isActive).toBe(false);
    expect(storageService.getCreatedUsers()[0]?.isActive).toBe(false);
  });

  it('resetUserPassword() calls PATCH /api/v1/users/:id/password with newPassword', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      message: 'Contraseña restablecida exitosamente',
    });

    const res = await usersService.resetUserPassword('col-99', 'NuevaClaveSegura2026');

    expect(patchSpy).toHaveBeenCalledWith('/api/v1/users/col-99/password', {
      newPassword: 'NuevaClaveSegura2026',
    });
    expect(res.message).toContain('restablecida');
  });

  it('deleteUser() calls DELETE /api/v1/users/:id and removes user from local cache', async () => {
    storageService.saveCreatedUsers([
      { id: 'col-50', username: 'temp_user', role: 'COLLABORATOR', isActive: true },
    ]);

    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ deleted: true });

    const res = await usersService.deleteUser('col-50');

    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/users/col-50');
    expect(res.deleted).toBe(true);
    expect(storageService.getCreatedUsers()).toHaveLength(0);
  });
});

