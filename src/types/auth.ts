import type { ApiUser, ApiUserProfile } from './api';

/**
 * Roles jerárquicos del sistema RBAC en monolith-backend.
 */
export type Role = NonNullable<ApiUserProfile['role']> extends 'ADMIN' | 'MANAGER' | 'COLLABORATOR'
  ? 'ADMIN' | 'MANAGER' | 'COLLABORATOR'
  : 'ADMIN' | 'MANAGER' | 'COLLABORATOR';

/**
 * Entidad de usuario del sistema sincronizada con el contrato OpenAPI (`ApiUser`).
 */
export interface User extends Partial<Omit<ApiUser, 'id' | 'username' | 'role' | 'isActive' | 'createdAt'>> {
  id: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Sesión autenticada activa almacenada en el cliente.
 */
export interface UserSession {
  token: string;
  user: {
    id: string;
    username: string;
    role: Role;
    isActive?: boolean;
    createdById?: string | null;
  };
}

/**
 * Credenciales requeridas para iniciar sesión (`POST /api/v1/auth/login`).
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Datos de entrada para registrar un nuevo usuario (`POST /api/v1/users`).
 */
export interface CreateUserInput {
  username: string;
  password: string;
  role?: Role;
}

/**
 * Payload para cambio de contraseña propia (`PATCH /api/v1/auth/password`).
 */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Respuesta del servidor tras actualizar la contraseña.
 */
export interface ChangePasswordResponse {
  message: string;
}

/**
 * Respuesta del servidor tras cerrar sesión (`POST /api/v1/auth/logout`).
 */
export interface LogoutResponse {
  message: string;
}

/**
 * Respuesta del endpoint de rotación de token (`POST /api/v1/auth/refresh`).
 */
export interface RefreshResponse {
  token: string;
  user?: {
    id?: string;
    username?: string;
    role?: Role;
  };
}
