import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import { authService } from '../services/authService';

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
});
