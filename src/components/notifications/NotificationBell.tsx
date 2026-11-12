import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationsPopover } from './NotificationsPopover';
import type { NotificationItem } from '../../types/notifications';

/**
 * Propiedades del botón de campana de notificaciones in-app (`NotificationBell`).
 */
export interface NotificationBellProps {
  onNavigateToForms?: (resourceId?: string | null) => void;
  autoInit?: boolean;
}

/**
 * Campana de notificaciones en tiempo real con badge numérico de no leídas
 * y bandeja desplegable (`NotificationsPopover`).
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({
  onNavigateToForms,
  autoInit = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    unreadOnly,
    setUnreadOnly,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications(autoInit);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      void loadNotifications(unreadOnly);
    }
  };

  const handleFilterChange = (onlyUnread: boolean) => {
    setUnreadOnly(onlyUnread);
    void loadNotifications(onlyUnread);
  };

  const handleSelectNotification = (item: NotificationItem) => {
    setIsOpen(false);
    if (
      item.type === 'FORM_NEW_ENTRY' ||
      item.type === 'FORM_ENTRY_RESOLVED' ||
      item.resourceId
    ) {
      onNavigateToForms?.(item.resourceId);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={handleToggle}
        data-testid="notification-bell-btn"
        aria-label="Notificaciones"
        title="Bandeja de notificaciones"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 28,
          borderRadius: 'var(--radius-sm)',
          background: isOpen ? 'var(--accent-primary-bg)' : 'var(--bg-card)',
          border: isOpen
            ? '1px solid var(--accent-primary)'
            : '1px solid var(--border-subtle)',
          color: isOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
          cursor: 'pointer',
        }}
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 15,
              height: 15,
              padding: '0 4px',
              borderRadius: 999,
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationsPopover
          notifications={notifications}
          unreadCount={unreadCount}
          unreadOnly={unreadOnly}
          loading={loading}
          onToggleUnreadOnly={handleFilterChange}
          onMarkAsRead={(id) => void markAsRead(id)}
          onMarkAllAsRead={() => void markAllAsRead()}
          onDeleteNotification={(id) => void removeNotification(id)}
          onSelectNotification={handleSelectNotification}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

