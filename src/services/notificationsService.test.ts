/**
 * Suite de pruebas unitarias para `notificationsService` (Fase 19 — 9 Endpoints #67 a #75).
 * @module services/notificationsService.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsService } from './notificationsService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./storageService', () => ({
  storageService: {
    getConfig: vi.fn(() => ({ baseUrl: 'http://localhost:3000', apiKey: 'test-key' })),
    getToken: vi.fn(() => 'jwt-test-token-123'),
  },
}));

describe('notificationsService (Módulo 24 — Bandeja In-App, SSE y Suscripciones)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe listar notificaciones paginadas con filtro unreadOnly (GET /api/v1/notifications)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [
        {
          id: 'notif-1',
          userId: 'u-1',
          type: 'FORM_NEW_ENTRY',
          title: 'Nueva respuesta recibida',
          message: 'Se registró una entrada en Canal de Denuncias',
          metadata: { formId: 'f-1', entryId: 'e-1' },
          isRead: false,
          createdAt: '2026-03-30T12:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 15, totalPages: 1 },
    });

    const result = await notificationsService.fetchNotifications({
      page: 1,
      limit: 15,
      unreadOnly: true,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/notifications?page=1&limit=15&unreadOnly=true'
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].type).toBe('FORM_NEW_ENTRY');
    expect(result.meta.total).toBe(1);
  });

  it('debe consultar el contador de no leídas (GET /api/v1/notifications/unread-count)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { unreadCount: 7 },
    });

    const count = await notificationsService.fetchUnreadCount();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications/unread-count');
    expect(count).toBe(7);
  });

  it('debe marcar una notificación individual como leída (PATCH /api/v1/notifications/:id/read)', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      data: {
        id: 'notif-1',
        type: 'FORM_ENTRY_RESOLVED',
        title: 'Dictamen registrado',
        message: 'Entrada aprobada',
        isRead: true,
        readAt: '2026-03-30T12:05:00Z',
        createdAt: '2026-03-30T12:00:00Z',
      },
    });

    const updated = await notificationsService.markNotificationAsRead('notif-1');
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/notifications/notif-1/read', {});
    expect(updated.read).toBe(true);
  });

  it('debe marcar todas las notificaciones como leídas (PATCH /api/v1/notifications/read-all)', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      data: { updatedCount: 4 },
    });

    const res = await notificationsService.markAllNotificationsAsRead();
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/notifications/read-all', {});
    expect(res.updatedCount).toBe(4);
  });

  it('debe eliminar una notificación (DELETE /api/v1/notifications/:id)', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

    await notificationsService.deleteNotification('notif-99');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/notifications/notif-99');
  });

  it('debe construir la URL del stream SSE con token JWT (GET /api/v1/notifications/stream)', () => {
    const url = notificationsService.getNotificationStreamUrl();
    expect(storageService.getConfig).toHaveBeenCalled();
    expect(url).toBe(
      'http://localhost:3000/api/v1/notifications/stream?token=jwt-test-token-123'
    );
  });

  it('debe suscribirse y actualizar preferencias de un formulario (POST /api/v1/forms/:id/subscribe)', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        id: 'sub-1',
        formId: 'form-10',
        userId: 'u-1',
        notifyOnNewEntry: true,
        notifyOnResolution: false,
      },
    });

    const sub = await notificationsService.subscribeToForm('form-10', {
      notifyOnNewEntry: true,
      notifyOnResolution: false,
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/forms/form-10/subscribe', {
      notifyOnNewEntry: true,
      notifyOnResolution: false,
    });
    expect(sub.formId).toBe('form-10');
    expect(sub.notifyOnNewEntry).toBe(true);
    expect(sub.notifyOnResolution).toBe(false);
  });

  it('debe cancelar la suscripción a un formulario (DELETE /api/v1/forms/:id/subscribe)', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

    await notificationsService.unsubscribeFromForm('form-10');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/forms/form-10/subscribe');
  });

  it('debe consultar el estado de suscripción actual a un formulario (GET /api/v1/forms/:id/subscription)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        subscribed: true,
        subscription: {
          id: 'sub-1',
          formId: 'form-10',
          userId: 'u-1',
          notifyOnNewEntry: true,
          notifyOnResolution: true,
        },
      },
    });

    const status = await notificationsService.getFormSubscription('form-10');
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/forms/form-10/subscription');
    expect(status.subscribed).toBe(true);
    expect(status.subscription?.id).toBe('sub-1');
  });
});
