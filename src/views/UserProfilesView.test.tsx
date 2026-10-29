import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UserProfilesView } from './UserProfilesView';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';

const renderUserProfilesView = () => {
  return render(
    <AuthProvider>
      <ToastProvider>
        <UserProfilesView />
      </ToastProvider>
    </AuthProvider>
  );
};

describe('UserProfilesView Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    storageService.saveSession({
      token: 'admin-token',
      user: { id: 'admin-1', username: 'admin', role: 'ADMIN' },
    });
  });

  it('renders title, admin badge, form and master admin card', () => {
    renderUserProfilesView();

    expect(screen.getByRole('heading', { name: /Gestión de Perfiles/i })).toBeInTheDocument();
    expect(screen.getByText(/Panel de Administrador/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de Usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña Temporal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ADMIN MAESTRO/i).length).toBeGreaterThanOrEqual(1);
  });

  it('validates minimum length for username and password', async () => {
    renderUserProfilesView();

    const usernameInput = screen.getByLabelText(/Nombre de Usuario/i);
    const passInput = screen.getByLabelText(/Contraseña Temporal/i);
    const submitBtn = screen.getByRole('button', { name: /Registrar Perfil/i });

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'ab' } });
      fireEvent.change(passInput, { target: { value: '123' } });
      fireEvent.click(submitBtn);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/al menos 3 caracteres/i);
  });

  it('creates profile and displays it in directory', async () => {
    const createSpy = vi.spyOn(authService, 'createUser').mockResolvedValue({
      user: {
        id: 'new-collab-id',
        username: 'colaborador_test',
        role: 'USER',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    });

    renderUserProfilesView();

    const usernameInput = screen.getByLabelText(/Nombre de Usuario/i);
    const passInput = screen.getByLabelText(/Contraseña Temporal/i);
    const submitBtn = screen.getByRole('button', { name: /Registrar Perfil/i });

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'colaborador_test' } });
      fireEvent.change(passInput, { target: { value: 'Secr3tPass!' } });
      fireEvent.click(submitBtn);
    });

    expect(createSpy).toHaveBeenCalledWith({
      username: 'colaborador_test',
      password: 'Secr3tPass!',
      role: 'USER',
    });

    expect(screen.getByText(/¡Perfil creado exitosamente!/i)).toBeInTheDocument();
    expect(screen.getByText('colaborador_test')).toBeInTheDocument();
  });
});
