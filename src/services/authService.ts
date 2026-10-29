import { apiClient } from './apiClient';
import { storageService } from './storageService';
import type { LoginCredentials, UserSession, User, CreateUserInput } from '../types/auth';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<UserSession> {
    const session = await apiClient.post<UserSession>('/api/v1/auth/login', credentials, {
      skipAuth: true,
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

  logout(): void {
    storageService.saveSession(null);
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
