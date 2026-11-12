import { useState, useEffect, useCallback, useContext } from 'react';
import { notificationsService } from '../services/notificationsService';
import { storageService } from '../services/storageService';
import { AuthContext } from '../context/authContextDef';
import { ToastContext } from '../context/toastContextDef';
import type { NotificationItem } from '../types/notifications';

/**
 * Custom hook para gestionar la bandeja de notificaciones in-app y la conexión
 * en tiempo real mediante Server-Sent Events (`GET /api/v1/notifications/stream`).
 */
export function useNotifications(autoInit: boolean = true) {
  const authContext = useContext(AuthContext);
  const toastContext = useContext(ToastContext);
  const showToast = toastContext?.showToast;
  const storedToken =
    typeof storageService.getToken === 'function' ? storageService.getToken() : null;
  const isAuthenticated = authContext ? authContext.isAuthenticated : Boolean(storedToken);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Consulta el listado de notificaciones y el conteo de pendientes en el backend.
   */
  const loadNotifications = useCallback(
    async (filterUnread?: boolean) => {
      const effectiveUnread = filterUnread !== undefined ? filterUnread : unreadOnly;
      setLoading(true);
      try {
        const [listRes, countRes] = await Promise.all([
          notificationsService.fetchNotifications({
            page: 1,
            limit: 25,
            unreadOnly: effectiveUnread ? true : undefined,
          }),
          notificationsService.fetchUnreadCount(),
        ]);
        setNotifications(listRes.data);
        setUnreadCount(countRes);
      } catch {
        // Silencioso en modo desconectado
      } finally {
        setLoading(false);
      }
    },
    [unreadOnly]
  );

  /**
   * Refresca únicamente el contador numérico de notificaciones no leídas.
   */
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsService.fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silencioso si el servidor no responde
    }
  }, []);

  /**
   * Marca una notificación individual como leída (`PATCH /api/v1/notifications/:id/read`).
   */
  const markAsRead = useCallback(async (id: string) => {
    try {
      const updated = await notificationsService.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updated, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  /**
   * Marca todas las notificaciones pendientes como leídas (`PATCH /api/v1/notifications/read-all`).
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsService.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, []);

  /**
   * Elimina una notificación de la bandeja (`DELETE /api/v1/notifications/:id`).
   */
  const removeNotification = useCallback(async (id: string) => {
    try {
      await notificationsService.deleteNotification(id);
    } catch {
      // Limpieza optimista
    }
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !autoInit) return;
    const token =
      typeof storageService.getToken === 'function' ? storageService.getToken() : null;
    const isTestToken =
      !token ||
      token.startsWith('dev_') ||
      token.startsWith('mock-') ||
      token.startsWith('token-');

    let active = true;
    if (!isTestToken) {
      notificationsService
        .fetchUnreadCount()
        .then((count) => {
          if (active) setUnreadCount(count);
        })
        .catch(() => {
          // Silencioso si el servidor no responde
        });
    }

    if (typeof window === 'undefined' || typeof window.EventSource !== 'function' || isTestToken) {
      return () => {
        active = false;
      };
    }

    const streamUrl = notificationsService.getNotificationStreamUrl(token);
    const es = new window.EventSource(streamUrl);

    const handleIncomingEvent = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as Partial<NotificationItem> & {
          isRead?: boolean;
          metadata?: { formId?: string };
        };
        const item: NotificationItem = {
          id: parsed.id || `ntf-${Date.now()}`,
          userId: parsed.userId,
          type:
            parsed.type === 'FORM_NEW_ENTRY' || parsed.type === 'FORM_ENTRY_RESOLVED'
              ? parsed.type
              : 'SYSTEM',
          title: parsed.title || 'Notificación',
          message: parsed.message || '',
          resourceId: parsed.resourceId ?? parsed.metadata?.formId ?? null,
          read: Boolean(parsed.read ?? parsed.isRead),
          createdAt: parsed.createdAt || new Date().toISOString(),
        };
        setNotifications((prev) => [item, ...prev.filter((n) => n.id !== item.id)]);
        setUnreadCount((prev) => prev + 1);
        showToast?.(`${item.title}: ${item.message}`, 'info');
      } catch {
        // Ignorar heartbeats o tramas vacías
      }
    };

    es.addEventListener('notification', handleIncomingEvent as EventListener);
    es.onmessage = handleIncomingEvent;

    return () => {
      active = false;
      es.close();
    };
  }, [isAuthenticated, autoInit, showToast]);

  return {
    notifications,
    unreadCount,
    unreadOnly,
    setUnreadOnly,
    loading,
    loadNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  };
}
