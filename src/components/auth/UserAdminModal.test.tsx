import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UserAdminModal } from './UserAdminModal';
import { AuthProvider } from '../../context/AuthContext';
import { authService } from '../../services/authService';

describe('UserAdminModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('does not render if user is not admin', () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'jwt.user',
      user: { id: '2', username: 'standard', role: 'USER' },
    });

    render(
      <AuthProvider>
        <UserAdminModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.queryByText(/Panel de Administración: Crear Usuario/i)).toBeNull();
  });

  it('renders and creates user if caller is ADMIN', async () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'jwt.admin',
      user: { id: '1', username: 'admin', role: 'ADMIN' },
    });

    const mockNewUser = {
      user: {
        id: 'new-u',
        username: 'juan',
        role: 'USER' as const,
        isActive: true,
        createdAt: '2026-10-28',
      },
    };
    vi.spyOn(authService, 'createUser').mockResolvedValue(mockNewUser);

    render(
      <AuthProvider>
        <UserAdminModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.getByText(/Panel de Administración: Crear Usuario/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nombre de Usuario/i), { target: { value: 'juan' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: '123456' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Crear Usuario/i }));
    });

    expect(screen.getByText("Usuario 'juan' creado exitosamente.")).toBeInTheDocument();
  });
});
