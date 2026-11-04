import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LoginView } from './LoginView';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { authService } from '../services/authService';

const renderLoginView = (onLoginSuccess = vi.fn(), onExploreDemo = vi.fn()) => {
  return render(
    <AuthProvider>
      <ToastProvider>
        <LoginView onLoginSuccess={onLoginSuccess} onExploreDemo={onExploreDemo} />
      </ToastProvider>
    </AuthProvider>
  );
};

describe('LoginView Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders login heading and input fields', () => {
    renderLoginView();

    expect(screen.getByRole('heading', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de Usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar al Dashboard/i })).toBeInTheDocument();
  });

  it('shows error banner when submitting with empty fields', async () => {
    renderLoginView();

    const submitBtn = screen.getByRole('button', { name: /Entrar al Dashboard/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/usuario y contraseña/i);
  });

  it('allows typing credentials and submitting form', async () => {
    const loginSpy = vi.spyOn(authService, 'login').mockResolvedValue({
      token: 'mock.admin.jwt',
      user: { id: 'admin-id', username: 'admin', role: 'ADMIN' },
    });

    const onLoginSuccess = vi.fn();
    renderLoginView(onLoginSuccess);

    const userInput = screen.getByLabelText(/Nombre de Usuario/i);
    const passInput = screen.getByLabelText('Contraseña');
    const submitBtn = screen.getByRole('button', { name: /Entrar al Dashboard/i });

    await act(async () => {
      fireEvent.change(userInput, { target: { value: 'admin' } });
      fireEvent.change(passInput, { target: { value: 'AdminPass123!' } });
      fireEvent.click(submitBtn);
    });

    expect(loginSpy).toHaveBeenCalledWith({ username: 'admin', password: 'AdminPass123!' });
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
  });
});
