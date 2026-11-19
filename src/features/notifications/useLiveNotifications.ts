import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { connectNotificationsStream } from '../../services/notificationsStream';
import { queryKeys } from '../../queries/queryKeys';
import type {
  NotificationItem,
  NotificationsPaginatedResponse,
} from '../../types/notifications';
import type { FetchNotificationsParams } from '../../services/notificationsService';

/**
 * Resultado expuesto por el hook de suscripción SSE de notificaciones en vivo.
 */
export interface LiveNotificationsState {
  /** Indica si el canal SSE autenticado (`Authorization: Bearer`) está conectado actualmente. */
  isConnected: boolean;
}

/**
 * Inserta una notificación recibida por SSE en la caché paginada de TanStack Query
 * sin duplicarla y respetando el filtro `unreadOnly` de cada clave activa.
 */
function prependNotificationToCache(
  existing: NotificationsPaginatedResponse | undefined,
  incoming: NotificationItem,
  params?: FetchNotificationsParams
): NotificationsPaginatedResponse | undefined {
  if (!existing) return existing;
  if (params?.unreadOnly && incoming.read) return existing;
  if (existing.data.some((item) => item.id === incoming.id)) return existing;

  return {
    ...existing,
    data: [incoming, ...existing.data],
    meta: {
      ...existing.meta,
      total: existing.meta.total + 1,
    },
  };
}

/**
 * Hook de ciclo de vida de notificaciones en tiempo real vía SSE (`GET /api/v1/notifications/stream`
 * con `fetch` + `ReadableStream` y cabecera `Authorization: Bearer`).
 *
 * Al recibir `event: notification`, actualiza optimísticamente `unreadCount` y las listas en caché
 * de TanStack Query y muestra un Toast no intrusivo. Debe montarse una única vez en el App Shell.
 */
export function useLiveNotifications(): LiveNotificationsState {
  const { isAuthenticated, token } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [streamConnected, setStreamConnected] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const shouldConnect = Boolean(isAuthenticated && token);

  useEffect(() => {
    if (!shouldConnect) {
      return undefined;
    }

    const handle = connectNotificationsStream({
      onConnected: () => setStreamConnected(true),
      onDisconnected: () => setStreamConnected(false),
      onNotification: (notification) => {
        if (seenIdsRef.current.has(notification.id)) return;
        seenIdsRef.current.add(notification.id);

        if (!notification.read) {
          queryClient.setQueryData<number>(
            queryKeys.notifications.unreadCount(),
            (prev) => (typeof prev === 'number' ? prev + 1 : 1)
          );
        }

        const cachedLists = queryClient.getQueriesData<NotificationsPaginatedResponse>({
          queryKey: ['notifications', 'list'],
        });
        cachedLists.forEach(([key, data]) => {
          const params = Array.isArray(key) ? (key[2] as FetchNotificationsParams | undefined) : undefined;
          const updated = prependNotificationToCache(data, notification, params);
          if (updated && updated !== data) {
            queryClient.setQueryData<NotificationsPaginatedResponse>(key, updated);
          }
        });

        const summary = notification.message
          ? `${notification.title} — ${notification.message}`
          : notification.title;
        showToastRef.current(summary, 'info');
      },
    });

    return () => {
      handle.disconnect();
    };
  }, [shouldConnect, token, queryClient]);

  return { isConnected: shouldConnect && streamConnected };
}
