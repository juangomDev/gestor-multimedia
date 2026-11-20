import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import { authService } from '../services/authService';
import { apiClient, ApiError } from '../services/apiClient';
import { storageService, STORAGE_KEYS } from '../services/storageService';

const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, isAdmin, login, logout } = useAuth();

  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'LOGGED_IN' : 'GUEST'}</span>
      <span data-testid="user-name">{user?.username || 'none'}</span>
      <span data-testid="is-admin">{isAdmin ? 'ADMIN' : 'NOT_ADMIN'}</span>
      <button onClick={() => login({ username: 'admin', password: '123' })}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders guest state initially and logs in user', async () => {
    const mockSession = {
      token: 'jwt.token.test',
      user: { id: 'u1', username: 'admin', role: 'ADMIN' as const },
    };
    vi.spyOn(authService, 'login').mockResolvedValue(mockSession);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('GUEST');
    expect(screen.getByTestId('user-name')).toHaveTextContent('none');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('NOT_ADMIN');

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');
    expect(screen.getByTestId('user-name')).toHaveTextContent('admin');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('ADMIN');

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('GUEST');
  });

  it('synchronizes user profile via GET /api/v1/auth/me on mount when token exists', async () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'jwt.token.stored',
      user: { id: 'u-cached', username: 'cached_name', role: 'ADMIN' },
    });
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);

    const getMeSpy = vi.spyOn(authService, 'getMe').mockResolvedValue({
      user: {
        id: 'u-db-123',
        username: 'server_name',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01',
      },
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(getMeSpy).toHaveBeenCalled();
    expect(screen.getByTestId('user-name')).toHaveTextContent('server_name');
  });

  it('purga la caché de QueryClient al cerrar sesión y al recibir evento cross-tab storage', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['folders', 'tree'], [{ id: 'priv-folder' }]);
    const clearSpy = vi.spyOn(queryClient, 'clear');

    storageService.resetCache();
    storageService.saveSession({
      token: 'jwt-user-a',
      user: { id: 'ua', username: 'user_a', role: 'ADMIN' },
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue({
      user: { id: 'ua', username: 'user_a', role: 'ADMIN', isActive: true },
    });
    vi.spyOn(authService, 'logout').mockImplementation(async () => {
      storageService.saveSession(null);
    });

    await act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        </QueryClientProvider>
      );
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');

    await act(async () => {
      screen.getByText('Logout').click();
    });
    expect(clearSpy).toHaveBeenCalled();
    expect(queryClient.getQueryData(['folders', 'tree'])).toBeUndefined();
    expect(screen.getByTestId('auth-status')).toHaveTextContent('GUEST');

    // Simular cierre de sesión / cambio en otra pestaña vía evento storage
    queryClient.setQueryData(['folders', 'tree'], [{ id: 'tab-stale' }]);
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEYS.AUTH_SESSION, newValue: null })
      );
    });
    expect(queryClient.getQueryData(['folders', 'tree'])).toBeUndefined();
  });

  it('ignora un rechazo 401 rezagado de getMe() del montaje cuando ya hubo un login nuevo', async () => {
    const queryClient = new QueryClient();
    storageService.resetCache();
    storageService.saveSession({
      token: 'stale-token',
      user: { id: 'old', username: 'old_user', role: 'COLLABORATOR' },
    });

    let rejectMountMe!: (err: unknown) => void;
    vi.spyOn(authService, 'getMe').mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectMountMe = reject;
        })
    );
    vi.spyOn(authService, 'login').mockImplementation(async () => {
      const fresh = {
        token: 'fresh-jwt',
        user: { id: 'u-new', username: 'admin', role: 'ADMIN' as const },
      };
      storageService.saveSession(fresh);
      return fresh;
    });
    vi.spyOn(authService, 'getMe').mockResolvedValueOnce({
      user: { id: 'u-new', username: 'admin', role: 'ADMIN', isActive: true },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </QueryClientProvider>
    );

    await act(async () => {
      screen.getByText('Login').click();
    });
    expect(screen.getByTestId('user-name')).toHaveTextContent('admin');

    // El getMe() del montaje anterior falla tardíamente con 401 -> NO debe tumbar el login nuevo
    await act(async () => {
      rejectMountMe(new ApiError(401, 'UNAUTHORIZED', 'Expired old token'));
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');
    expect(screen.getByTestId('user-name')).toHaveTextContent('admin');
    // Limpiar cualquier listener interno de apiClient sin afectar otras pruebas
    expect(apiClient.onUnauthorized).toBeTypeOf('function');
  });
});
