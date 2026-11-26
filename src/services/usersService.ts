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
 * Parámetros de filtrado y paginación server-side para `GET /api/v1/users`.
 */
export interface FetchUsersOptions {
  /** Búsqueda por nombre de usuario (`search`). */
  search?: string;
  /** Filtrar por rol (`ADMIN`, `MANAGER`, `COLLABORATOR`). */
  role?: Role;
  /** Filtrar por estado activo (`true`) o suspendido (`false`). */
  isActive?: boolean;
  /** Número de página (1-indexed). */
  page?: number;
  /** Límite de registros por página. */
  limit?: number;
}

/**
 * Respuesta paginada normalizada de usuarios (`GET /api/v1/users`).
 */
export interface PaginatedUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
}

function buildUsersEndpoint(options?: FetchUsersOptions): string {
  const params = new URLSearchParams();
  if (options?.search && options.search.trim()) params.set('search', options.search.trim());
  if (options?.role) params.set('role', options.role);
  if (options?.isActive !== undefined) params.set('isActive', String(options.isActive));
  if (options?.page !== undefined) params.set('page', String(options.page));
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  const qs = params.toString();
  return qs ? `/api/v1/users?${qs}` : '/api/v1/users';
}

/**
 * Servicio sin estado de administración jerárquica de usuarios RBAC (`monolith-backend`).
 * Cubre las 5 rutas de `/api/v1/users` con soporte de filtrado y paginación server-side.
 */
export class UsersService {
  /**
   * Obtiene el listado paginado y filtrado server-side de usuarios según la jerarquía del usuario
   * en sesión (`GET /api/v1/users`).
   *
   * @param options Filtros opcionales (`search`, `role`, `isActive`, `page`, `limit`).
   * @returns Usuarios normalizados y metadatos de paginación.
   */
  async listUsersPaginated(options?: FetchUsersOptions): Promise<PaginatedUsersResponse> {
    const endpoint = buildUsersEndpoint(options);
    const res = await apiClient.get<{
      users?: ApiUser[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
      meta?: {
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasNext?: boolean;
      };
    }>(endpoint);

    const users = (res.users || []).map((u) => normalizeUser(u));
    const total = res.meta?.total ?? res.total ?? users.length;
    const page = res.meta?.page ?? res.page ?? options?.page ?? 1;
    const limit = res.meta?.limit ?? res.limit ?? options?.limit ?? Math.max(users.length, 25);
    const totalPages =
      res.meta?.totalPages ?? res.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));
    const hasNext = res.meta?.hasNext ?? page < totalPages;

    return { users, total, page, limit, totalPages, hasNext };
  }

  /**
   * Obtiene la lista plana de usuarios visibles según la jerarquía del usuario en sesión
   * (`GET /api/v1/users`), útil en selectores de compartición y vistas resumidas.
   *
   * @param options Filtros opcionales.
   * @returns Lista de usuarios registrados en PostgreSQL.
   */
  async listUsers(options?: FetchUsersOptions): Promise<User[]> {
    const { users } = await this.listUsersPaginated(options);
    return users;
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
