import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { usersService } from '../../services/usersService';
import { auditService } from '../../services/auditService';
import { storageStatsService } from '../../services/storageStatsService';
import { notificationsService } from '../../services/notificationsService';
import { storageService } from '../../services/storageService';
import { TeamPage } from './TeamPage';
import type { Role, User } from '../../types/auth';

const USERS_FIXTURE: User[] = [
  {
    id: 'u-mgr',
    username: 'jefe_ops',
    role: 'MANAGER',
    isActive: true,
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'u-collab',
    username: 'ana.colab',
    role: 'COLLABORATOR',
    isActive: true,
    createdAt: '2026-11-05T10:00:00Z',
  },
  {
    id: 'u-ai',
    username: 'ai_manager',
    role: 'COLLABORATOR',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
  },
];

function renderTeamPage(role: Role = 'MANAGER') {
  const user = {
    id: role === 'ADMIN' ? 'u-admin' : 'u-mgr',
    username: role === 'ADMIN' ? 'root_admin' : 'jefe_ops',
    role,
    isActive: true,
  };
  storageService.saveSession({ token: `jwt-${role}`, user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(0);

  const queryClient = createAppQueryClient();
  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={['/team']}>
        <TeamPage />
      </MemoryRouter>
    </AppProviders>
  );
}

describe('TeamPage y UsersDirectoryPanel (Fase 7.1 — RBAC, Colaboradores, Actividad y Cuota)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
  });

  it('protege ai_manager y auto-cuenta, crea COLLABORATOR como MANAGER, suspende, resetea clave y elimina', async () => {
    vi.spyOn(usersService, 'listUsers').mockResolvedValue(USERS_FIXTURE);
    const createSpy = vi.spyOn(usersService, 'createUser').mockResolvedValue({
      user: {
        id: 'u-new',
        username: 'luis.nuevo',
        role: 'COLLABORATOR',
        isActive: true,
        createdAt: '2026-11-19T12:00:00Z',
      },
    });
    const statusSpy = vi.spyOn(usersService, 'updateUserStatus').mockResolvedValue({
      user: { ...USERS_FIXTURE[1], isActive: false },
    });
    const resetSpy = vi.spyOn(usersService, 'resetUserPassword').mockResolvedValue({
      message: 'ok',
    });
    const deleteSpy = vi.spyOn(usersService, 'deleteUser').mockResolvedValue({ deleted: true });

    renderTeamPage('MANAGER');

    expect(await screen.findByTestId('user-row-ana.colab')).toBeInTheDocument();

    // Protecciones sobre ai_manager y cuenta propia
    expect(screen.queryByTestId('delete-user-btn-ai_manager')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-user-btn-jefe_ops')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Estado activo de ai_manager')).toBeDisabled();

    // Alta jerárquica (MANAGER solo puede crear COLLABORATOR)
    fireEvent.click(screen.getByTestId('open-create-user-btn'));
    const roleSelect = await screen.findByTestId('create-user-role-select');
    expect(roleSelect).toBeDisabled();
    expect(roleSelect).toHaveValue('COLLABORATOR');

    fireEvent.change(screen.getByLabelText('Nombre de usuario'), {
      target: { value: 'luis.nuevo' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña inicial'), {
      target: { value: 'ClaveSegura99' },
    });
    fireEvent.click(screen.getByTestId('create-user-submit-btn'));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        username: 'luis.nuevo',
        password: 'ClaveSegura99',
        role: 'COLLABORATOR',
      });
    });

    // Toggle suspender colaborador
    fireEvent.click(screen.getByLabelText('Estado activo de ana.colab'));
    await waitFor(() => {
      expect(statusSpy).toHaveBeenCalledWith('u-collab', false);
    });

    // Reset de contraseña con generador
    fireEvent.click(screen.getByTestId('reset-pwd-btn-ana.colab'));
    fireEvent.click(await screen.findByTestId('reset-password-generate-btn'));
    fireEvent.click(screen.getByTestId('reset-password-submit-btn'));
    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith('u-collab', expect.any(String));
    });

    // Borrado en cascada
    fireEvent.click(screen.getByTestId('delete-user-btn-ana.colab'));
    fireEvent.click(await screen.findByTestId('delete-user-confirm-btn'));
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('u-collab');
    });
  });

  it('permite a ADMIN elegir rol MANAGER o COLLABORATOR y carga Actividad y Cuota bajo demanda', async () => {
    vi.spyOn(usersService, 'listUsers').mockResolvedValue(USERS_FIXTURE);
    const statsSpy = vi.spyOn(storageStatsService, 'fetchStorageStats').mockResolvedValue({
      isAdmin: false,
      database: {
        images: { count: 4, sizeBytes: 409600 },
        tables: { count: 2, sizeBytes: 102400 },
        pdfs: { count: 1, sizeBytes: 204800 },
        totalCount: 7,
        totalSizeBytes: 716800,
      },
      disk: null,
      topFolders: [{ id: 'f1', name: 'Campaña Q4', type: 'image', totalBytes: 409600, itemsCount: 4 }],
    });
    const auditSpy = vi.spyOn(auditService, 'fetchAuditLogs').mockResolvedValue({
      logs: [
        {
          id: 'log-1',
          actorUsername: 'ana.colab',
          action: 'IMAGE_UPLOAD',
          resourceType: 'IMAGE',
          resourceId: 'img-12345678',
          createdAt: '2026-11-19T14:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderTeamPage('ADMIN');

    // En la pestaña inicial NO se piden stats ni audit-logs (cero waterfalls)
    expect(await screen.findByTestId('users-table')).toBeInTheDocument();
    expect(statsSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();

    // ADMIN puede elegir MANAGER en CreateUserDialog
    fireEvent.click(screen.getByTestId('open-create-user-btn'));
    const roleSelect = await screen.findByTestId('create-user-role-select');
    expect(roleSelect).not.toBeDisabled();
    fireEvent.change(roleSelect, { target: { value: 'MANAGER' } });
    expect(roleSelect).toHaveValue('MANAGER');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    // Cambiar a pestaña Actividad y cuota
    const activityTab = screen.getByRole('tab', { name: 'Actividad y cuota' });
    fireEvent.mouseDown(activityTab);
    fireEvent.click(activityTab);

    await waitFor(() => {
      expect(statsSpy).toHaveBeenCalledTimes(1);
      expect(auditSpy).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Campaña Q4')).toBeInTheDocument();
    const auditTable = await screen.findByTestId('audit-logs-table');
    expect(within(auditTable).getByText('IMAGE_UPLOAD')).toBeInTheDocument();
  });

  it('oculta filtros exclusivos de ADMIN (API_KEY) en auditoría cuando accede un MANAGER', async () => {
    vi.spyOn(usersService, 'listUsers').mockResolvedValue(USERS_FIXTURE);
    vi.spyOn(storageStatsService, 'fetchStorageStats').mockResolvedValue({
      isAdmin: false,
      database: {
        images: { count: 0, sizeBytes: 0 },
        tables: { count: 0, sizeBytes: 0 },
        pdfs: { count: 0, sizeBytes: 0 },
        totalCount: 0,
        totalSizeBytes: 0,
      },
      disk: null,
      topFolders: [],
    });
    vi.spyOn(auditService, 'fetchAuditLogs').mockResolvedValue({
      logs: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderTeamPage('MANAGER');
    await screen.findByTestId('users-table');

    const activityTab = screen.getByRole('tab', { name: 'Actividad y cuota' });
    fireEvent.mouseDown(activityTab);
    fireEvent.click(activityTab);

    const actionFilter = await screen.findByTestId('audit-action-filter');
    const resourceFilter = screen.getByTestId('audit-resource-filter');
    expect(actionFilter.textContent).not.toContain('API_KEY_CREATE');
    expect(resourceFilter.textContent).not.toContain('API_KEY');
  });
});
