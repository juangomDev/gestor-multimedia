import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  notificationsService,
  type FetchNotificationsParams,
} from '../services/notificationsService';
import type { NotificationsPaginatedResponse } from '../types/notifications';
import { queryKeys } from './queryKeys';

/**
 * Consulta la bandeja paginada de notificaciones del usuario (`GET /api/v1/notifications`).
 */
export function useNotificationsListQuery(
  params: FetchNotificationsParams = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationsService.fetchNotifications(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Consulta el contador rápido de notificaciones no leídas (`GET /api/v1/notifications/unread-count`).
 */
export function useUnreadNotificationsCountQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationsService.fetchUnreadCount(),
    enabled,
  });
}

/**
 * Mutación optimista para marcar una notificación individual como leída
 * (`PATCH /api/v1/notifications/:id/read`), con rollback automático si falla el servidor.
 */
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.markNotificationAsRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      const previousLists = queryClient.getQueriesData<NotificationsPaginatedResponse>({
        queryKey: ['notifications', 'list'],
      });
      const previousUnread = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount()
      );

      let wasUnread = false;
      previousLists.forEach(([key, data]) => {
        if (!data) return;
        const params = Array.isArray(key) ? (key[2] as FetchNotificationsParams | undefined) : undefined;
        const target = data.data.find((n) => n.id === id);
        if (target && !target.read) wasUnread = true;
        queryClient.setQueryData<NotificationsPaginatedResponse>(
          key,
          params?.unreadOnly
            ? {
                ...data,
                data: data.data.filter((n) => n.id !== id),
                meta: {
                  ...data.meta,
                  total: Math.max(0, data.meta.total - (target && !target.read ? 1 : 0)),
                },
              }
            : {
                ...data,
                data: data.data.map((n) => (n.id === id ? { ...n, read: true } : n)),
              }
        );
      });

      if (wasUnread && typeof previousUnread === 'number') {
        queryClient.setQueryData<number>(
          queryKeys.notifications.unreadCount(),
          Math.max(0, previousUnread - 1)
        );
      }

      return { previousLists, previousUnread };
    },
    onError: (_err, _id, context) => {
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousUnread !== undefined) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousUnread);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Mutación optimista para marcar toda la bandeja como leída
 * (`PATCH /api/v1/notifications/read-all`), con rollback seguro ante errores.
 */
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllNotificationsAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      const previousLists = queryClient.getQueriesData<NotificationsPaginatedResponse>({
        queryKey: ['notifications', 'list'],
      });
      const previousUnread = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount()
      );

      previousLists.forEach(([key, data]) => {
        if (!data) return;
        const params = Array.isArray(key) ? (key[2] as FetchNotificationsParams | undefined) : undefined;
        queryClient.setQueryData<NotificationsPaginatedResponse>(
          key,
          params?.unreadOnly
            ? { ...data, data: [], meta: { ...data.meta, total: 0, totalPages: 1 } }
            : { ...data, data: data.data.map((n) => ({ ...n, read: true })) }
        );
      });

      queryClient.setQueryData<number>(queryKeys.notifications.unreadCount(), 0);
      return { previousLists, previousUnread };
    },
    onError: (_err, _vars, context) => {
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousUnread !== undefined) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousUnread);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Mutación optimista para eliminar una notificación (`DELETE /api/v1/notifications/:id`).
 */
export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.deleteNotification(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      const previousLists = queryClient.getQueriesData<NotificationsPaginatedResponse>({
        queryKey: ['notifications', 'list'],
      });
      const previousUnread = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount()
      );

      let removedUnread = false;
      previousLists.forEach(([key, data]) => {
        if (!data) return;
        const target = data.data.find((n) => n.id === id);
        if (target && !target.read) removedUnread = true;
        queryClient.setQueryData<NotificationsPaginatedResponse>(key, {
          ...data,
          data: data.data.filter((n) => n.id !== id),
          meta: {
            ...data.meta,
            total: Math.max(0, data.meta.total - (target ? 1 : 0)),
          },
        });
      });

      if (removedUnread && typeof previousUnread === 'number') {
        queryClient.setQueryData<number>(
          queryKeys.notifications.unreadCount(),
          Math.max(0, previousUnread - 1)
        );
      }

      return { previousLists, previousUnread };
    },
    onError: (_err, _id, context) => {
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousUnread !== undefined) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousUnread);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Mutación optimista para limpiar todas las notificaciones ya leídas
 * (`DELETE /api/v1/notifications/read`), con rollback seguro ante errores.
 */
export function useDeleteReadNotificationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.deleteReadNotifications(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      const previousLists = queryClient.getQueriesData<NotificationsPaginatedResponse>({
        queryKey: ['notifications', 'list'],
      });

      previousLists.forEach(([key, data]) => {
        if (!data) return;
        const remaining = data.data.filter((n) => !n.read);
        const removed = data.data.length - remaining.length;
        if (removed === 0) return;
        queryClient.setQueryData<NotificationsPaginatedResponse>(key, {
          ...data,
          data: remaining,
          meta: {
            ...data.meta,
            total: Math.max(0, data.meta.total - removed),
          },
        });
      });

      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
