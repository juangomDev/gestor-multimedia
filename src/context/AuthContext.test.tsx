import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
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

    act(() => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('GUEST');
  });
});
