import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { UserProfilesView } from './UserProfilesView';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { usersService } from '../services/usersService';
import { storageService } from '../services/storageService';
import type { User } from '../types/auth';

/**
 * Renderiza `UserProfilesView` envuelto en `AuthProvider` y `ToastProvider`.
 */
const renderView = () =>
  render(
    <AuthProvider>
      <ToastProvider>
        <UserProfilesView />
      </ToastProvider>
    </AuthProvider>
  );

const sampleUsers: User[] = [
  {
    id: 'mgr-10',
    username: 'gestor_norte',
    role: 'MANAGER',
    isActive: true,
    createdById: 'admin-1',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'col-20',
    username: 'operador_sur',
    role: 'COLLABORATOR',
    isActive: false,
    createdById: 'mgr-10',
    createdAt: '2026-01-18T14:30:00.000Z',
  },
];

describe('UserProfilesView — RBAC & PostgreSQL CRUD Integration (Módulo 12)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    storageService.saveSession({
      token: 'admin-token',
      user: { id: 'admin-1', username: 'admin', role: 'ADMIN' },
    });
  });

  it('loads users from usersService.listUsers() and renders table columns', async () => {
    const listSpy = vi.spyOn(usersService, 'listUsers').mockResolvedValue(sampleUsers);

    renderView();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(1);
    });

    const table = await screen.findByRole('table', { name: /Tabla de usuarios registrados/i });
    expect(table).toBeInTheDocument();

    // Verificar encabezados de tabla requeridos en 12.2.3
    expect(screen.getByRole('columnheader', { name: /Usuario/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Rol/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Creado por/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Estado/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Fecha de registro/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Acciones/i })).toBeInTheDocument();

    // Verificar filas y estados
    expect(screen.getByTestId('user-row-gestor_norte')).toHaveTextContent('MANAGER');
    expect(screen.getByTestId('user-row-gestor_norte')).toHaveTextContent('admin (Tú)');
    expect(screen.getByTestId('user-row-gestor_norte')).toHaveTextContent('Activo');

    expect(screen.getByTestId('user-row-operador_sur')).toHaveTextContent('COLLABORATOR');
    expect(screen.getByTestId('user-row-operador_sur')).toHaveTextContent('gestor_norte');
    expect(screen.getByTestId('user-row-operador_sur')).toHaveTextContent('Suspendido');
  });

  it('allows ADMIN to select MANAGER role when creating a user', async () => {
    vi.spyOn(usersService, 'listUsers').mockResolvedValue([]);
    const createSpy = vi.spyOn(usersService, 'createUser').mockResolvedValue({
      user: {
        id: 'mgr-99',
        username: 'nuevo_gestor',
        role: 'MANAGER',
        isActive: true,
        createdById: 'admin-1',
        createdAt: '2026-02-10T10:00:00.000Z',
      },
    });

    renderView();

    const usernameInput = screen.getByLabelText(/Nombre de Usuario/i);
    const passInput = screen.getByLabelText(/Contraseña Temporal/i);
    const roleSelect = screen.getByLabelText(/Rol Jerárquico Asignado/i);
    const submitBtn = screen.getByRole('button', { name: /Registrar Perfil/i });

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'nuevo_gestor' } });
      fireEvent.change(passInput, { target: { value: 'GestorPass99!' } });
      fireEvent.change(roleSelect, { target: { value: 'MANAGER' } });
      fireEvent.click(submitBtn);
    });

    expect(createSpy).toHaveBeenCalledWith({
      username: 'nuevo_gestor',
      password: 'GestorPass99!',
      role: 'MANAGER',
    });
    expect(screen.getByTestId('user-row-nuevo_gestor')).toHaveTextContent('MANAGER');
  });

  it('locks role to COLLABORATOR when logged in as MANAGER', async () => {
    storageService.saveSession({
      token: 'mgr-token',
      user: { id: 'mgr-10', username: 'gestor_norte', role: 'MANAGER' },
    });
    vi.spyOn(usersService, 'listUsers').mockResolvedValue([]);
    const createSpy = vi.spyOn(usersService, 'createUser').mockResolvedValue({
      user: {
        id: 'col-77',
        username: 'colab_subordinado',
        role: 'COLLABORATOR',
        isActive: true,
        createdById: 'mgr-10',
        createdAt: '2026-02-10T11:00:00.000Z',
      },
    });

    renderView();

    expect(screen.getByText(/Panel de Gestor \(MANAGER\)/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Rol Jerárquico Asignado/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Como MANAGER, todos los usuarios que crees/i)).toBeInTheDocument();

    const usernameInput = screen.getByLabelText(/Nombre de Usuario/i);
    const passInput = screen.getByLabelText(/Contraseña Temporal/i);
    const submitBtn = screen.getByRole('button', { name: /Registrar Perfil/i });

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'colab_subordinado' } });
      fireEvent.change(passInput, { target: { value: 'ColabPass77!' } });
      fireEvent.click(submitBtn);
    });

    expect(createSpy).toHaveBeenCalledWith({
      username: 'colab_subordinado',
      password: 'ColabPass77!',
      role: 'COLLABORATOR',
    });
  });

  it('toggles user status in 1 click via usersService.updateUserStatus', async () => {
    vi.spyOn(usersService, 'listUsers').mockResolvedValue(sampleUsers);
    const statusSpy = vi.spyOn(usersService, 'updateUserStatus').mockResolvedValue({
      user: {
        ...sampleUsers[0],
        isActive: false,
      },
    });

    renderView();

    const suspendBtn = await screen.findByRole('button', {
      name: /Suspender usuario gestor_norte/i,
    });

    await act(async () => {
      fireEvent.click(suspendBtn);
    });

    expect(statusSpy).toHaveBeenCalledWith('mgr-10', false);
    expect(screen.getByTestId('user-row-gestor_norte')).toHaveTextContent('Suspendido');
  });

  it('opens ResetUserPasswordModal, generates random password and calls usersService.resetUserPassword', async () => {
    vi.spyOn(usersService, 'listUsers').mockResolvedValue(sampleUsers);
    const resetSpy = vi.spyOn(usersService, 'resetUserPassword').mockResolvedValue({
      message: 'Clave actualizada',
    });

    renderView();

    const resetBtn = await screen.findByRole('button', {
      name: /Restablecer contraseña de gestor_norte/i,
    });

    await act(async () => {
      fireEvent.click(resetBtn);
    });

    expect(
      screen.getByRole('heading', { name: /Restablecer contraseña: gestor_norte/i })
    ).toBeInTheDocument();

    const genBtn = screen.getByRole('button', { name: /Generar contraseña aleatoria/i });
    await act(async () => {
      fireEvent.click(genBtn);
    });

    const passInput = screen.getByLabelText(/Nueva Contraseña Asignada/i) as HTMLInputElement;
    expect(passInput.value.length).toBe(12);

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Nueva Clave/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(resetSpy).toHaveBeenCalledWith('mgr-10', passInput.value);
  });

  it('opens DeleteUserModal with cascade warning and deletes user via usersService.deleteUser', async () => {
    vi.spyOn(usersService, 'listUsers').mockResolvedValue(sampleUsers);
    const deleteSpy = vi.spyOn(usersService, 'deleteUser').mockResolvedValue({ deleted: true });

    renderView();

    const deleteTrigger = await screen.findByRole('button', {
      name: /Eliminar usuario operador_sur/i,
    });

    await act(async () => {
      fireEvent.click(deleteTrigger);
    });

    expect(
      screen.getByRole('heading', { name: /Eliminar usuario: operador_sur/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Advertencia de eliminación en cascada/i)).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /Eliminar Permanentemente/i });
    await act(async () => {
      fireEvent.click(confirmDeleteBtn);
    });

    expect(deleteSpy).toHaveBeenCalledWith('col-20');
    expect(screen.queryByTestId('user-row-operador_sur')).not.toBeInTheDocument();
  });
});

