import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LoginModal } from './LoginModal';
import { AuthProvider } from '../../context/AuthContext';
import { authService } from '../../services/authService';

describe('LoginModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('validates empty inputs', async () => {
    render(
      <AuthProvider>
        <LoginModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /Iniciar Sesión/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(screen.getByText('Por favor completa todos los campos.')).toBeInTheDocument();
  });

  it('submits valid credentials and triggers onSuccess and onClose', async () => {
    const mockSession = {
      token: 'jwt.valid.token',
      user: { id: '1', username: 'admin', role: 'ADMIN' as const },
    };
    vi.spyOn(authService, 'login').mockResolvedValue(mockSession);

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AuthProvider>
        <LoginModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'secret123' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));
    });

    expect(authService.login).toHaveBeenCalledWith({ username: 'admin', password: 'secret123' });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
