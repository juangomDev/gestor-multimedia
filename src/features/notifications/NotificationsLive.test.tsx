import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { notificationsService } from '../../services/notificationsService';
import * as notificationsStream from '../../services/notificationsStream';
import { formsService } from '../../services/formsService';
import { storageService } from '../../services/storageService';
import { useLiveNotifications } from './useLiveNotifications';
import { NotificationBell } from './NotificationBell';
import type { NotificationItem } from '../../types/notifications';

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'ntf-1',
    type: 'FORM_NEW_ENTRY',
    title: 'Nueva entrada en Proveedores',
    message: 'Acme SA envió un registro.',
    resourceId: 'form-42',
    read: false,
    createdAt: '2026-11-19T12:00:00Z',
  },
  {
    id: 'ntf-2',
    type: 'SYSTEM',
    title: 'Respaldo completado',
    message: 'Integridad verificada.',
    resourceId: null,
    read: true,
    createdAt: '2026-11-18T10:00:00Z',
  },
];

function BellHarness() {
  useLiveNotifications();
  return <NotificationBell />;
}

function renderBellHarness() {
  const user = { id: 'u-admin', username: 'admin', role: 'ADMIN' as const, isActive: true };
  storageService.saveSession({ token: 'jwt-admin', user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  const queryClient = createAppQueryClient();

  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<BellHarness />} />
          <Route
            path="/folder/:folderId/forms/:formId"
            element={<div data-testid="form-target-route">Formulario destino cargado</div>}
          />
        </Routes>
      </MemoryRouter>
    </AppProviders>
  );
}

describe('Notificaciones en Vivo SSE, Bell y NotificationsPopover (Fase 6.1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
  });

  it('recibe evento SSE en vivo, incrementa unreadCount, actualiza caché y muestra Toast', async () => {
    let capturedOptions: notificationsStream.NotificationsStreamOptions | null = null;
    const disconnectSpy = vi.fn();

    vi.spyOn(notificationsStream, 'connectNotificationsStream').mockImplementation((opts) => {
      capturedOptions = opts;
      return { disconnect: disconnectSpy };
    });
    vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(1);
    vi.spyOn(notificationsService, 'fetchNotifications').mockResolvedValue({
      data: INITIAL_NOTIFICATIONS,
      meta: { page: 1, limit: 25, total: 2, totalPages: 1 },
    });

    const { unmount } = renderBellHarness();

    expect(await screen.findByTestId('notification-bell-count')).toHaveTextContent('1');
    expect(capturedOptions).not.toBeNull();

    // Simular evento SSE `notification`
    act(() => {
      capturedOptions?.onConnected?.();
      capturedOptions?.onNotification({
        id: 'ntf-live-99',
        type: 'FORM_ENTRY_RESOLVED',
        title: 'Dictamen sellado',
        message: 'Entrada aprobada como VALID.',
        resourceId: 'form-42',
        read: false,
        createdAt: '2026-11-19T16:30:00Z',
      });
    });

    expect(await screen.findByTestId('notification-bell-count')).toHaveTextContent('2');
    expect(await screen.findByText(/Dictamen sellado/i)).toBeInTheDocument();

    unmount();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('soporta tabs Todas / No leídas, marcar individual, marcar todas y eliminar', async () => {
    vi.spyOn(notificationsStream, 'connectNotificationsStream').mockReturnValue({
      disconnect: vi.fn(),
    });
    vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(2);
    const listSpy = vi
      .spyOn(notificationsService, 'fetchNotifications')
      .mockImplementation(async (params) => ({
        data: params?.unreadOnly
          ? INITIAL_NOTIFICATIONS.filter((n) => !n.read)
          : INITIAL_NOTIFICATIONS,
        meta: { page: 1, limit: 25, total: 2, totalPages: 1 },
      }));
    const markReadSpy = vi
      .spyOn(notificationsService, 'markNotificationAsRead')
      .mockResolvedValue({ ...INITIAL_NOTIFICATIONS[0], read: true });
    const markAllSpy = vi
      .spyOn(notificationsService, 'markAllNotificationsAsRead')
      .mockResolvedValue({ updatedCount: 1 });
    const deleteSpy = vi
      .spyOn(notificationsService, 'deleteNotification')
      .mockResolvedValue({ success: true });
    const deleteReadSpy = vi
      .spyOn(notificationsService, 'deleteReadNotifications')
      .mockResolvedValue({ deletedCount: 1 });

    renderBellHarness();
    fireEvent.click(await screen.findByTestId('notification-bell-trigger'));

    expect(await screen.findByText('Nueva entrada en Proveedores')).toBeInTheDocument();
    expect(screen.getByText('Respaldo completado')).toBeInTheDocument();

    // Limpiar notificaciones leídas desde la pestaña Todas (DELETE /api/v1/notifications/read)
    fireEvent.click(screen.getByTestId('notifications-clear-read-btn'));
    await waitFor(() => {
      expect(deleteReadSpy).toHaveBeenCalledTimes(1);
    });

    // Cambiar a pestaña No leídas y esperar la nueva consulta
    const unreadTab = screen.getByRole('tab', { name: 'No leídas' });
    fireEvent.mouseDown(unreadTab);
    fireEvent.click(unreadTab);
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ unreadOnly: true }));
    });

    // Marcar individual y eliminar
    const markOneBtn = await screen.findByLabelText('Marcar "Nueva entrada en Proveedores" como leída');
    fireEvent.click(markOneBtn);
    await waitFor(() => {
      expect(markReadSpy).toHaveBeenCalledWith('ntf-1');
    });

    fireEvent.click(
      await screen.findByLabelText('Eliminar notificación "Nueva entrada en Proveedores"')
    );
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('ntf-1');
    });

    // Probar Marcar todas con pendientes aún activos
    fireEvent.click(await screen.findByTestId('notifications-mark-all-btn'));
    await waitFor(() => {
      expect(markAllSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('navega directo a /folder/:folderId/forms/:formId al pulsar una notificación de formulario', async () => {
    vi.spyOn(notificationsStream, 'connectNotificationsStream').mockReturnValue({
      disconnect: vi.fn(),
    });
    vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(2);
    vi.spyOn(notificationsService, 'fetchNotifications').mockResolvedValue({
      data: INITIAL_NOTIFICATIONS,
      meta: { page: 1, limit: 25, total: 2, totalPages: 1 },
    });
    vi.spyOn(notificationsService, 'markNotificationAsRead').mockResolvedValue({
      ...INITIAL_NOTIFICATIONS[0],
      read: true,
    });
    const getFormSpy = vi.spyOn(formsService, 'getForm').mockResolvedValue({
      id: 'form-42',
      slug: 'proveedores',
      title: 'Proveedores',
      folderId: 'fld-tbls',
      entryFieldsSchema: [],
      resolutionFieldsSchema: [],
      allowedResolutionStates: ['VALID', 'INVALID'],
      createdAt: '2026-11-01T00:00:00Z',
    });

    renderBellHarness();
    fireEvent.click(await screen.findByTestId('notification-bell-trigger'));

    fireEvent.click(await screen.findByText('Nueva entrada en Proveedores'));

    await waitFor(() => {
      expect(getFormSpy).toHaveBeenCalledWith('form-42');
      expect(screen.getByTestId('form-target-route')).toBeInTheDocument();
    });
  });

  it('navega con tipo OpenAPI FORM_ENTRY_NEW, reconecta al cambiar apiBaseUrl e invalida tras reconexión', async () => {
    const capturedCalls: notificationsStream.NotificationsStreamOptions[] = [];
    const disconnectSpies: ReturnType<typeof vi.fn>[] = [];

    vi.spyOn(notificationsStream, 'connectNotificationsStream').mockImplementation((opts) => {
      capturedCalls.push(opts);
      const disconnect = vi.fn();
      disconnectSpies.push(disconnect);
      return { disconnect };
    });
    const unreadSpy = vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(1);
    vi.spyOn(notificationsService, 'fetchNotifications').mockResolvedValue({
      data: [
        {
          id: 'ntf-openapi',
          type: 'FORM_ENTRY_NEW',
          title: 'Nueva denuncia OpenAPI',
          message: 'Registro #9',
          resourceId: 'form-99',
          read: false,
          createdAt: '2026-11-20T01:00:00Z',
        },
      ],
      meta: { page: 1, limit: 25, total: 1, totalPages: 1 },
    });
    vi.spyOn(notificationsService, 'markNotificationAsRead').mockResolvedValue({
      id: 'ntf-openapi',
      type: 'FORM_ENTRY_NEW',
      title: 'Nueva denuncia OpenAPI',
      message: 'Registro #9',
      resourceId: 'form-99',
      read: true,
      createdAt: '2026-11-20T01:00:00Z',
    });
    vi.spyOn(formsService, 'getForm').mockResolvedValue({
      id: 'form-99',
      slug: 'denuncias',
      title: 'Denuncias',
      folderId: 'fld-99',
      entryFieldsSchema: [],
      resolutionFieldsSchema: [],
      allowedResolutionStates: ['VALID', 'INVALID'],
      createdAt: '2026-11-01T00:00:00Z',
    });

    renderBellHarness();
    await screen.findByTestId('notification-bell-count');
    expect(capturedCalls).toHaveLength(1);

    // Simular desconexión y reconexión -> debe invalidar y reconsultar unreadCount
    act(() => {
      capturedCalls[0].onDisconnected?.();
      capturedCalls[0].onConnected?.();
    });
    await waitFor(() => {
      expect(unreadSpy).toHaveBeenCalledTimes(2);
    });

    // Cambiar apiBaseUrl debe desconectar el stream anterior y reconectar al nuevo servidor
    act(() => {
      storageService.setApiBaseUrl('https://nuevo-servidor.example.com');
    });
    await waitFor(() => {
      expect(disconnectSpies[0]).toHaveBeenCalledTimes(1);
      expect(capturedCalls).toHaveLength(2);
    });

    // Click en notificación FORM_ENTRY_NEW navega al formulario
    fireEvent.click(screen.getByTestId('notification-bell-trigger'));
    fireEvent.click(await screen.findByText('Nueva denuncia OpenAPI'));
    expect(await screen.findByTestId('form-target-route')).toBeInTheDocument();
  });
});
