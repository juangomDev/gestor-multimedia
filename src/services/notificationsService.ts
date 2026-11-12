import { apiClient } from './apiClient';
import { storageService } from './storageService';
import { cleanBaseUrl } from '../utils/formatters';
import type {
  NotificationItem,
  NotificationsPaginatedResponse,
  UnreadCountResponse,
  FormSubscription,
  FormSubscriptionPreferences,
  FormSubscriptionStatusResponse,
} from '../types/notifications';

/**
 * Parámetros de filtrado y paginación para consultar la bandeja de notificaciones (`GET /api/v1/notifications`).
 */
export interface FetchNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Normaliza un registro de notificación devuelto por `monolith-backend`.
 */
export function normalizeNotification(
  raw?: (Partial<NotificationItem> & { isRead?: boolean; metadata?: { formId?: string } }) | null
): NotificationItem {
  const safe = raw || {};
  return {
    id: safe.id || `ntf-${Date.now()}`,
    userId: safe.userId,
    type:
      safe.type === 'FORM_NEW_ENTRY' || safe.type === 'FORM_ENTRY_RESOLVED'
        ? safe.type
        : 'SYSTEM',
    title: safe.title || 'Notificación',
    message: safe.message || '',
    resourceId: safe.resourceId ?? safe.metadata?.formId ?? null,
    read: Boolean(safe.read ?? safe.isRead),
    createdAt: safe.createdAt || new Date().toISOString(),
  };
}

/**
 * Servicio de bandeja de notificaciones in-app, streaming SSE en tiempo real
 * y suscripciones a formularios (`monolith-backend` Fase 19 — Rutas #67 a #75).
 */
export class NotificationsService {
  /**
   * Obtiene el listado paginado de notificaciones del usuario (`GET /api/v1/notifications`).
   */
  async fetchNotifications(
    params: FetchNotificationsParams = {}
  ): Promise<NotificationsPaginatedResponse> {
    const qs = new URLSearchParams();
    if (params.page !== undefined) qs.set('page', String(params.page));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.unreadOnly !== undefined) qs.set('unreadOnly', String(params.unreadOnly));

    const queryString = qs.toString();
    const endpoint = queryString ? `/api/v1/notifications?${queryString}` : '/api/v1/notifications';

    const res = await apiClient.get<{
      data?: Partial<NotificationItem>[];
      notifications?: Partial<NotificationItem>[];
      meta?: { page: number; limit: number; total: number; totalPages: number };
    }>(endpoint);

    const rawItems = res?.data || res?.notifications || [];
    const data = rawItems.map((item) => normalizeNotification(item));
    const meta = res?.meta || {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: data.length,
      totalPages: 1,
    };

    return { data, meta };
  }

  /**
   * Obtiene el conteo rápido de notificaciones no leídas (`GET /api/v1/notifications/unread-count`).
   */
  async fetchUnreadCount(): Promise<number> {
    const res = await apiClient.get<
      UnreadCountResponse & { data?: UnreadCountResponse }
    >('/api/v1/notifications/unread-count');
    return Number(res?.unreadCount ?? res?.data?.unreadCount ?? 0);
  }

  /**
   * Marca una notificación individual como leída (`PATCH /api/v1/notifications/:id/read`).
   */
  async markNotificationAsRead(id: string): Promise<NotificationItem> {
    const res = await apiClient.patch<
      { notification?: Partial<NotificationItem>; data?: Partial<NotificationItem> } & Partial<NotificationItem>
    >(`/api/v1/notifications/${id}/read`, {});
    return normalizeNotification(res?.notification || res?.data || res);
  }

  /**
   * Marca todas las notificaciones pendientes de la bandeja como leídas (`PATCH /api/v1/notifications/read-all`).
   */
  async markAllNotificationsAsRead(): Promise<{ updatedCount: number }> {
    const res = await apiClient.patch<{
      updatedCount?: number;
      data?: { updatedCount?: number };
    }>('/api/v1/notifications/read-all', {});
    return { updatedCount: Number(res?.updatedCount ?? res?.data?.updatedCount ?? 0) };
  }

  /**
   * Elimina una notificación de la bandeja del usuario (`DELETE /api/v1/notifications/:id`).
   */
  async deleteNotification(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success?: boolean }>(`/api/v1/notifications/${id}`);
    return { success: res?.success ?? true };
  }

  /**
   * Construye la URL de conexión Server-Sent Events (SSE) en tiempo real (`GET /api/v1/notifications/stream?token=...`).
   */
  getNotificationStreamUrl(tokenOverride?: string | null): string {
    const config =
      typeof storageService.getConfig === 'function'
        ? storageService.getConfig()
        : { baseUrl: 'http://localhost:3000', apiKey: '' };
    const rawBase =
      config?.baseUrl ||
      (config as { apiBaseUrl?: string })?.apiBaseUrl ||
      'http://localhost:3000';
    const baseUrl = cleanBaseUrl(rawBase);
    const token =
      tokenOverride ??
      (typeof storageService.getToken === 'function' ? storageService.getToken() : null);
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${baseUrl}/api/v1/notifications/stream${qs}`;
  }

  /**
   * Suscribe al usuario o actualiza sus preferencias de alerta en un formulario (`POST /api/v1/forms/:id/subscribe`).
   */
  async subscribeToForm(
    formId: string,
    prefs: FormSubscriptionPreferences = { notifyOnNewEntry: true, notifyOnResolution: true }
  ): Promise<FormSubscription> {
    const res = await apiClient.post<
      { subscription?: FormSubscription; data?: FormSubscription } & Partial<FormSubscription>
    >(`/api/v1/forms/${formId}/subscribe`, {
      notifyOnNewEntry: prefs.notifyOnNewEntry ?? true,
      notifyOnResolution: prefs.notifyOnResolution ?? true,
    });
    const sub = res?.subscription || res?.data || res;
    return {
      id: sub?.id,
      userId: sub?.userId,
      formId: sub?.formId || formId,
      notifyOnNewEntry: sub?.notifyOnNewEntry ?? true,
      notifyOnResolution: sub?.notifyOnResolution ?? true,
      createdAt: sub?.createdAt,
    };
  }

  /**
   * Cancela la suscripción a las alertas de un formulario (`DELETE /api/v1/forms/:id/subscribe`).
   */
  async unsubscribeFromForm(formId: string): Promise<{ unsubscribed: boolean }> {
    const res = await apiClient.delete<{ unsubscribed?: boolean; success?: boolean }>(
      `/api/v1/forms/${formId}/subscribe`
    );
    return { unsubscribed: res?.unsubscribed ?? res?.success ?? true };
  }

  /**
   * Consulta el estado de suscripción actual del usuario en un formulario (`GET /api/v1/forms/:id/subscription`).
   */
  async getFormSubscription(formId: string): Promise<FormSubscriptionStatusResponse> {
    const res = await apiClient.get<
      FormSubscriptionStatusResponse & { data?: FormSubscriptionStatusResponse }
    >(`/api/v1/forms/${formId}/subscription`);
    const payload = res?.data || res;
    return {
      subscribed: Boolean(payload?.subscribed),
      subscription: payload?.subscription ?? null,
    };
  }
}

export const notificationsService = new NotificationsService();
