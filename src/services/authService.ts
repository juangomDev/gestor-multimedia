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

export class AuthService {
  async login(credentials: LoginCredentials): Promise<UserSession> {
    const session = await apiClient.post<UserSession>('/api/v1/auth/login', credentials, {
      skipAuth: true,
      credentials: 'include',
    });
    storageService.saveSession(session);
    return session;
  }

  loginAsLocalSession(session: UserSession): UserSession {
    storageService.saveSession(session);
    return session;
  }

  async createUser(input: CreateUserInput): Promise<{ user: User }> {
    return apiClient.post<{ user: User }>('/api/v1/users', input);
  }

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

  async getMe(): Promise<{ user: User }> {
    const res = await apiClient.get<{ user: User }>('/api/v1/auth/me');
    if (res.user) {
      storageService.updateSessionUser(res.user);
    }
    return res;
  }

  async changePassword(input: ChangePasswordInput): Promise<ChangePasswordResponse> {
    return apiClient.patch<ChangePasswordResponse>('/api/v1/auth/password', input);
  }

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

  getSession(): UserSession | null {
    return storageService.getSession();
  }

  isAuthenticated(): boolean {
    return !!storageService.getToken();
  }

  isAdmin(): boolean {
    const session = this.getSession();
    return session?.user?.role === 'ADMIN';
  }
}

export const authService = new AuthService();
