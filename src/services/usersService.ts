import { apiClient } from './apiClient';
import { authService } from './authService';
import type { ApiUser } from '../types/api';
import type { User, CreateUserInput, Role } from '../types/auth';

/**
 * Normaliza un registro `ApiUser` proveniente del backend hacia la interfaz `User` del frontend.
 *
 * @param raw Objeto de usuario devuelto por la API.
 * @returns Entidad `User` tipada y con valores por defecto seguros.
 */
function normalizeUser(raw: Partial<ApiUser> & { id?: string; username?: string }): User {
  return {
    id: raw.id || '',
    username: raw.username || 'usuario',
    role: (raw.role as Role) || 'COLLABORATOR',
    isActive: raw.isActive ?? true,
    createdById: raw.createdById ?? null,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

/**
 * Servicio sin estado de administración jerárquica de usuarios RBAC (`monolith-backend`).
 * Cubre las 5 rutas de `/api/v1/users`.
 */
export class UsersService {
  /**
   * Obtiene la lista de usuarios visibles según la jerarquía del usuario en sesión (`GET /api/v1/users`).
   * `ADMIN` visualiza todos los usuarios; `MANAGER` visualiza sus colaboradores vinculados.
   *
   * @returns Lista de usuarios registrados en PostgreSQL.
   */
  async listUsers(): Promise<User[]> {
    const res = await apiClient.get<{ users?: ApiUser[] }>('/api/v1/users');
    return (res.users || []).map((u) => normalizeUser(u));
  }

  /**
   * Crea un nuevo usuario respetando la jerarquía RBAC (`POST /api/v1/users`).
   *
   * @param payload Credenciales y rol del nuevo usuario.
   * @returns El usuario recién creado.
   */
  async createUser(payload: CreateUserInput): Promise<{ user: User }> {
    const res = await authService.createUser(payload);
    return { user: normalizeUser(res.user) };
  }

  /**
   * Activa o suspende la cuenta de un usuario subordinado (`PATCH /api/v1/users/:id/status`).
   *
   * @param userId UUID del usuario a modificar.
   * @param isActive Nuevo estado (`true` activo, `false` suspendido).
   * @returns El usuario con su estado actualizado.
   */
  async updateUserStatus(userId: string, isActive: boolean): Promise<{ user: User }> {
    const res = await apiClient.patch<{ user?: ApiUser }>(`/api/v1/users/${userId}/status`, {
      isActive,
    });
    const updatedUser = normalizeUser({
      ...res.user,
      id: res.user?.id || userId,
      isActive: res.user?.isActive ?? isActive,
    });
    return { user: updatedUser };
  }

  /**
   * Restablece de forma forzada la contraseña de un usuario subordinado (`PATCH /api/v1/users/:id/password`).
   *
   * @param userId UUID del usuario cuya clave será restablecida.
   * @param newPassword Nueva contraseña (mínimo 6 caracteres).
   * @returns Mensaje de confirmación del servidor.
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.patch<{ message: string }>(`/api/v1/users/${userId}/password`, {
      newPassword,
    });
  }

  /**
   * Elimina permanentemente un usuario y sus archivos asociados en cascada (`DELETE /api/v1/users/:id`).
   *
   * @param userId UUID del usuario a eliminar.
   * @returns Confirmación de borrado (`{ deleted: boolean }`).
   */
  async deleteUser(userId: string): Promise<{ deleted: boolean }> {
    const res = await apiClient.delete<{ deleted: boolean }>(`/api/v1/users/${userId}`);
    return res ?? { deleted: true };
  }
}

/** Instancia singleton del servicio de administración de usuarios. */
export const usersService = new UsersService();
