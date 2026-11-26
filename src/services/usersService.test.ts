import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersService } from './usersService';
import { apiClient } from './apiClient';
import { authService } from './authService';

describe('UsersService (v2 Stateless RBAC User Administration)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listUsers() calls GET /api/v1/users and normalizes records without localStorage side effects', async () => {
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
  });

  it('createUser() delegates to authService.createUser and returns normalized user', async () => {
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
  });

  it('updateUserStatus() calls PATCH /api/v1/users/:id/status', async () => {
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

  it('deleteUser() calls DELETE /api/v1/users/:id', async () => {
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ deleted: true });

    const res = await usersService.deleteUser('col-50');

    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/users/col-50');
    expect(res.deleted).toBe(true);
  });

  it('listUsersPaginated() envía search, role, isActive, page y limit y normaliza res.meta', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      users: [
        {
          id: 'col-22',
          username: 'ana.colab',
          role: 'COLLABORATOR',
          isActive: true,
          createdAt: '2026-11-10T00:00:00Z',
        },
      ],
      meta: {
        page: 2,
        limit: 10,
        total: 14,
        totalPages: 2,
        hasNext: false,
      },
    });

    const pageRes = await usersService.listUsersPaginated({
      search: '  ana  ',
      role: 'COLLABORATOR',
      isActive: true,
      page: 2,
      limit: 10,
    });

    expect(getSpy).toHaveBeenCalledWith(
      '/api/v1/users?search=ana&role=COLLABORATOR&isActive=true&page=2&limit=10'
    );
    expect(pageRes.users).toHaveLength(1);
    expect(pageRes.total).toBe(14);
    expect(pageRes.page).toBe(2);
    expect(pageRes.totalPages).toBe(2);
    expect(pageRes.hasNext).toBe(false);
  });
});
