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

type RawLoginResponse = Partial<UserSession> & { accessToken?: string };
type RawRefreshResponse = Partial<RefreshResponse> & { accessToken?: string };

/**
 * Servicio de autenticación 100% real contra `monolith-backend`
 * (login, refresh HttpOnly, perfil `/me`, cambio de contraseña y logout).
 */
export class AuthService {
  /**
   * Inicia sesión con `POST /api/v1/auth/login` y persiste la sesión JWT real devuelta.
   * Normaliza `token` o `accessToken` según versión de respuesta del backend.
   *
   * @param credentials Usuario y contraseña reales.
   * @returns Sesión autenticada con JWT y perfil de usuario.
   */
  async login(credentials: LoginCredentials): Promise<UserSession> {
    const raw = await apiClient.post<RawLoginResponse>('/api/v1/auth/login', credentials, {
      skipAuth: true,
      credentials: 'include',
    });

    const token = raw.token ?? raw.accessToken;
    if (!token || !raw.user) {
      throw new Error('Respuesta de autenticación inválida del servidor');
    }

    const session: UserSession = {
      token,
      user: raw.user,
    };
    storageService.saveSession(session);
    return session;
  }

  /**
   * Crea un usuario respetando la jerarquía RBAC (`POST /api/v1/users`).
   *
   * @param input Credenciales y rol del nuevo usuario.
   * @returns Usuario registrado en PostgreSQL.
   */
  async createUser(input: CreateUserInput): Promise<{ user: User }> {
    return apiClient.post<{ user: User }>('/api/v1/users', input);
  }

  /**
   * Renueva el access token con `POST /api/v1/auth/refresh` (cookie HttpOnly).
   *
   * @returns Respuesta normalizada de refresco con el nuevo JWT.
   */
  async refresh(): Promise<RefreshResponse> {
    const raw = await apiClient.post<RawRefreshResponse>(
      '/api/v1/auth/refresh',
      undefined,
      {
        skipAuth: true,
        credentials: 'include',
      }
    );

    const token = raw.token ?? raw.accessToken ?? '';
    if (token) {
      storageService.saveToken(token);
      if (raw.user) {
        storageService.updateSessionUser(raw.user);
      }
    }

    return {
      token,
      ...(raw.accessToken ? { accessToken: raw.accessToken } : {}),
      ...(raw.user ? { user: raw.user } : {}),
    };
  }

  /**
   * Obtiene el perfil autenticado actual con `GET /api/v1/auth/me` y sincroniza el usuario en sesión.
   *
   * @returns Perfil del usuario en sesión.
   */
  async getMe(): Promise<{ user: User }> {
    const res = await apiClient.get<{ user: User }>('/api/v1/auth/me');
    if (res.user) {
      storageService.updateSessionUser(res.user);
    }
    return res;
  }

  /**
   * Cambia la contraseña del usuario autenticado (`PATCH /api/v1/auth/password`).
   *
   * @param input Contraseña actual y nueva contraseña.
   * @returns Confirmación del servidor.
   */
  async changePassword(input: ChangePasswordInput): Promise<ChangePasswordResponse> {
    return apiClient.patch<ChangePasswordResponse>('/api/v1/auth/password', input);
  }

  /**
   * Cierra la sesión en el backend (`POST /api/v1/auth/logout`) y limpia el almacenamiento local.
   */
  async logout(): Promise<void> {
    const token = storageService.getToken();
    storageService.saveSession(null);

    if (token) {
      try {
        await apiClient.post<LogoutResponse>(
          '/api/v1/auth/logout',
          undefined,
          {
            credentials: 'include',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch (err) {
        console.warn('Server logout failed or offline:', err);
      }
    }
  }

  /**
   * Recupera la sesión persistida actual.
   *
   * @returns Sesión almacenada o `null`.
   */
  getSession(): UserSession | null {
    return storageService.getSession();
  }

  /**
   * Indica si existe un token JWT almacenado localmente.
   *
   * @returns `true` cuando existe access token en sesión.
   */
  isAuthenticated(): boolean {
    return Boolean(storageService.getToken());
  }

  /**
   * Indica si el usuario en sesión tiene rol `ADMIN`.
   *
   * @returns `true` si el rol actual es `ADMIN`.
   */
  isAdmin(): boolean {
    return this.getSession()?.user?.role === 'ADMIN';
  }
}

/** Instancia singleton del servicio de autenticación. */
export const authService = new AuthService();
