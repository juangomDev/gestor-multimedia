/**
 * Tipo de evento de notificación generado por `monolith-backend`.
 */
export type NotificationType = 'FORM_NEW_ENTRY' | 'FORM_ENTRY_RESOLVED' | 'SYSTEM';

/**
 * Representación de una notificación in-app en la bandeja del usuario.
 */
export interface NotificationItem {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId?: string | null;
  read: boolean;
  createdAt: string;
}

/**
 * Metadatos de paginación del listado de notificaciones (`GET /api/v1/notifications`).
 */
export interface NotificationsPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Respuesta paginada de `GET /api/v1/notifications`.
 */
export interface NotificationsPaginatedResponse {
  data: NotificationItem[];
  meta: NotificationsPaginationMeta;
}

/**
 * Respuesta rápida de conteo de notificaciones no leídas (`GET /api/v1/notifications/unread-count`).
 */
export interface UnreadCountResponse {
  unreadCount: number;
}

/**
 * Preferencias de suscripción de alertas de un usuario sobre un formulario.
 */
export interface FormSubscriptionPreferences {
  notifyOnNewEntry?: boolean;
  notifyOnResolution?: boolean;
}

/**
 * Registro de suscripción a un formulario (`FormSubscription`).
 */
export interface FormSubscription {
  id?: string;
  userId?: string;
  formId: string;
  notifyOnNewEntry: boolean;
  notifyOnResolution: boolean;
  createdAt?: string;
}

/**
 * Respuesta de consulta del estado de suscripción (`GET /api/v1/forms/:id/subscription`).
 */
export interface FormSubscriptionStatusResponse {
  subscribed: boolean;
  subscription: FormSubscription | null;
}

