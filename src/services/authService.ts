import { apiClient } from './apiClient';
import { storageService } from './storageService';
import type {
  LoginCredentials,
  UserSession,
  User,
  CreateUserInput,
  ChangePasswordInput,
  ChangePasswordResponse,
  LogoutResponse,
  RefreshResponse,
} from '../types/auth';

/**
 * Servicio de autenticación contra monolith-backend (login, refresh, perfil, contraseña y logout).
 */
export class AuthService {
  /**
   * Inicia sesión con `POST /api/v1/auth/login` y persiste la sesión devuelta.
   * @param credentials Usuario y contraseña.
   * @returns Sesión con token JWT y usuario.
   */
  async login(credentials: LoginCredentials): Promise<UserSession> {
    const session = await apiClient.post<UserSession>('/api/v1/auth/login', credentials, {
      skipAuth: true,
      credentials: 'include',
    });
    storageService.saveSession(session);
    return session;
  }

  /**
   * Persiste una sesión local/demo sin contactar al backend (modo fallback).
   * @param session Sesión local a guardar.
   * @returns La misma sesión guardada.
   */
  loginAsLocalSession(session: UserSession): UserSession {
    storageService.saveSession(session);
    return session;
  }

  /**
   * Crea un usuario con `POST /api/v1/users`.
   * @param input Datos del nuevo usuario.
   * @returns Usuario creado.
   */
  async createUser(input: CreateUserInput): Promise<{ user: User }> {
    return apiClient.post<{ user: User }>('/api/v1/users', input);
  }

  /**
   * Renueva el access token con `POST /api/v1/auth/refresh` (cookie HttpOnly).
   * Solo actualiza el almacenamiento si el backend devuelve un token nuevo.
   * @returns Respuesta de refresco.
   */
  async refresh(): Promise<RefreshResponse> {
    const res = await apiClient.post<RefreshResponse>('/api/v1/auth/refresh', undefined, {
      skipAuth: true,
      credentials: 'include',
    });
    if (res.token) {
      storageService.saveToken(res.token);
      if (res.user) {
        storageService.updateSessionUser(res.user);
      }
    }
    return res;
  }

  /**
   * Obtiene el perfil actual con `GET /api/v1/auth/me` y sincroniza el usuario en sesión.
   * @returns Usuario autenticado.
   */
  async getMe(): Promise<{ user: User }> {
    const res = await apiClient.get<{ user: User }>('/api/v1/auth/me');
    if (res.user) {
      storageService.updateSessionUser(res.user);
    }
    return res;
  }

  /**
   * Cambia la contraseña propia con `PATCH /api/v1/auth/password`.
   * @param input Contraseña actual y nueva.
   * @returns Respuesta del backend.
   */
  async changePassword(input: ChangePasswordInput): Promise<ChangePasswordResponse> {
    return apiClient.patch<ChangePasswordResponse>('/api/v1/auth/password', input);
  }

  /**
   * Cierra la sesión local y, si el token es real (no `mock-`/`dev_`), notifica a `POST /api/v1/auth/logout`.
   */
  async logout(): Promise<void> {
    const token = storageService.getToken();
    storageService.saveSession(null);
    if (token && !token.startsWith('mock-') && !token.startsWith('dev_')) {
      try {
        await apiClient.post<LogoutResponse>('/api/v1/auth/logout', undefined, {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.warn('Server logout failed or offline:', err);
      }
    }
  }

  /**
   * @returns Sesión almacenada o `null`.
   */
  getSession(): UserSession | null {
    return storageService.getSession();
  }

  /**
   * @returns `true` si existe un token almacenado.
   */
  isAuthenticated(): boolean {
    return !!storageService.getToken();
  }

  /**
   * @returns `true` si el usuario en sesión tiene rol `ADMIN`.
   */
  isAdmin(): boolean {
    const session = this.getSession();
    return session?.user?.role === 'ADMIN';
  }
}

export const authService = new AuthService();
