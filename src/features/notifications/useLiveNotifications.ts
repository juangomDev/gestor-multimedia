import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { connectNotificationsStream } from '../../services/notificationsStream';
import { storageService } from '../../services/storageService';
import { queryKeys } from '../../queries/queryKeys';
import type {
  NotificationItem,
  NotificationsPaginatedResponse,
} from '../../types/notifications';
import type { FetchNotificationsParams } from '../../services/notificationsService';

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
 * de TanStack Query y muestra un Toast no intrusivo. Reconecta automáticamente si cambia `apiBaseUrl`
 * y reconcilia la bandeja tras recuperarse de una desconexión. Debe montarse una única vez en el App Shell.
 */
export function useLiveNotifications(): void {
  const { isAuthenticated, token } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [serverVersion, setServerVersion] = useState(0);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const hadDisconnectRef = useRef(false);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    return storageService.onBaseUrlChange(() => {
      setServerVersion((prev) => prev + 1);
    });
  }, []);

  const shouldConnect = Boolean(isAuthenticated && token);

  useEffect(() => {
    seenIdsRef.current.clear();
    hadDisconnectRef.current = false;

    if (!shouldConnect) {
      return undefined;
    }

    const handle = connectNotificationsStream({
      onConnected: () => {
        if (hadDisconnectRef.current) {
          hadDisconnectRef.current = false;
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        }
      },
      onDisconnected: () => {
        hadDisconnectRef.current = true;
      },
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
  }, [shouldConnect, token, serverVersion, queryClient]);
}
