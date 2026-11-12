/**
 * Suite de pruebas para `NotificationBell`, `NotificationsPopover`, `useNotifications` (SSE)
 * y `FormSubscriptionButton` (Módulo 24).
 * @module components/notifications/NotificationsPopover.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NotificationBell } from './NotificationBell';
import { FormSubscriptionButton } from '../forms/FormSubscriptionButton';
import { notificationsService } from '../../services/notificationsService';
import { storageService } from '../../services/storageService';
import type { NotificationItem } from '../../types/notifications';

vi.mock('../../services/notificationsService', () => ({
  notificationsService: {
    fetchNotifications: vi.fn(),
    fetchUnreadCount: vi.fn(),
    markNotificationAsRead: vi.fn(),
    markAllNotificationsAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    getNotificationStreamUrl: vi.fn(() => 'http://localhost:3000/api/v1/notifications/stream?token=eyJ-real-jwt'),
    subscribeToForm: vi.fn(),
    unsubscribeFromForm: vi.fn(),
    getFormSubscription: vi.fn(),
  },
}));

vi.mock('../../services/storageService', () => ({
  storageService: {
    getToken: vi.fn(() => 'eyJ-real-jwt'),
    getConfig: vi.fn(() => ({ baseUrl: 'http://localhost:3000', apiKey: 'k' })),
  },
}));

type SseListener = (event: MessageEvent) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  listeners: Record<string, SseListener[]> = {};
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: SseListener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  emit(type: string, payload: unknown) {
    const evt = { data: JSON.stringify(payload) } as MessageEvent;
    (this.listeners[type] || []).forEach((fn) => fn(evt));
  }
}

describe('Bandeja de Notificaciones In-App, SSE y Suscripciones a Formularios (Módulo 24)', () => {
  const sampleNotifications: NotificationItem[] = [
    {
      id: 'n-101',
      type: 'FORM_NEW_ENTRY',
      title: 'Nueva respuesta en Denuncias',
      message: 'Se recibió el folio #101',
      resourceId: 'f-1',
      read: false,
      createdAt: '2026-03-30T14:00:00Z',
    },
    {
      id: 'n-102',
      type: 'SYSTEM',
      title: 'Mantenimiento programado',
      message: 'Respaldo completado',
      read: true,
      createdAt: '2026-03-30T13:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
    vi.mocked(storageService.getToken).mockReturnValue('eyJ-real-jwt');
    vi.mocked(notificationsService.fetchUnreadCount).mockResolvedValue(1);
    vi.mocked(notificationsService.fetchNotifications).mockResolvedValue({
      data: sampleNotifications,
      meta: { total: 2, page: 1, limit: 25, totalPages: 1 },
    });
  });

  it('debe mostrar el badge de no leídas, abrir el popover, marcar como leída, navegar y eliminar', async () => {
    const onNavigateToForms = vi.fn();
    vi.mocked(notificationsService.markNotificationAsRead).mockResolvedValue({
      ...sampleNotifications[0],
      read: true,
    });
    vi.mocked(notificationsService.deleteNotification).mockResolvedValue({ success: true });

    render(<NotificationBell onNavigateToForms={onNavigateToForms} />);

    await waitFor(() => {
      expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('1');
    });

    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('notifications-popover')).toBeInTheDocument();
      expect(screen.getByText('Nueva respuesta en Denuncias')).toBeInTheDocument();
      expect(screen.getByText('Mantenimiento programado')).toBeInTheDocument();
    });

    // Eliminar la segunda notificación
    fireEvent.click(screen.getByTestId('delete-notification-n-102'));
    await waitFor(() => {
      expect(notificationsService.deleteNotification).toHaveBeenCalledWith('n-102');
    });

    // Hacer clic en la primera notificación (FORM_NEW_ENTRY) la marca como leída y navega a Formularios
    fireEvent.click(screen.getByText('Nueva respuesta en Denuncias'));
    await waitFor(() => {
      expect(notificationsService.markNotificationAsRead).toHaveBeenCalledWith('n-101');
      expect(onNavigateToForms).toHaveBeenCalledWith('f-1');
    });
  });

  it('debe recibir eventos SSE en tiempo real e incrementar el contador de alertas sin recargar', async () => {
    render(<NotificationBell />);

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0);
      expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('1');
    });

    const sseInstance = MockEventSource.instances[0];
    await act(async () => {
      sseInstance.emit('notification', {
        id: 'n-live-999',
        type: 'FORM_ENTRY_RESOLVED',
        title: 'Dictamen registrado en vivo',
        message: 'La entrada #999 fue validada',
        isRead: false,
        createdAt: '2026-03-30T15:00:00Z',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('2');
    });
  });

  it('debe permitir suscribirse, configurar preferencias y desuscribirse de un formulario', async () => {
    vi.mocked(notificationsService.getFormSubscription).mockResolvedValue({
      subscribed: false,
      subscription: null,
    });
    vi.mocked(notificationsService.subscribeToForm).mockResolvedValue({
      id: 'sub-55',
      formId: 'f-1',
      userId: 'u-1',
      notifyOnNewEntry: true,
      notifyOnResolution: true,
    });
    vi.mocked(notificationsService.unsubscribeFromForm).mockResolvedValue({ unsubscribed: true });

    render(<FormSubscriptionButton formId="f-1" formTitle="Canal de Denuncias" autoCheck />);

    await waitFor(() => {
      expect(notificationsService.getFormSubscription).toHaveBeenCalledWith('f-1');
    });

    const subBtn = screen.getByTestId('form-subscribe-btn-f-1');
    expect(subBtn).toHaveTextContent('Suscribirse a alertas');

    // Suscribirse
    fireEvent.click(subBtn);
    await waitFor(() => {
      expect(notificationsService.subscribeToForm).toHaveBeenCalledWith('f-1', {
        notifyOnNewEntry: true,
        notifyOnResolution: true,
      });
      expect(screen.getByTestId('form-subscribe-btn-f-1')).toHaveTextContent('Suscrito a alertas');
    });

    // Abrir preferencias y cambiar un checkbox
    fireEvent.click(screen.getByTestId('form-subscribe-prefs-btn-f-1'));
    expect(screen.getByTestId('form-subscribe-prefs-popover-f-1')).toBeInTheDocument();

    // Desuscribirse
    fireEvent.click(screen.getByTestId('form-subscribe-btn-f-1'));
    await waitFor(() => {
      expect(notificationsService.unsubscribeFromForm).toHaveBeenCalledWith('f-1');
      expect(screen.getByTestId('form-subscribe-btn-f-1')).toHaveTextContent(
        'Suscribirse a alertas'
      );
    });
  });
});
