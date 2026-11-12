import React from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  X,
} from 'lucide-react';
import type { NotificationItem } from '../../types/notifications';

/**
 * Propiedades del panel desplegable de la bandeja de notificaciones (`NotificationsPopover`).
 */
export interface NotificationsPopoverProps {
  notifications: NotificationItem[];
  unreadCount: number;
  unreadOnly: boolean;
  loading?: boolean;
  onToggleUnreadOnly: (unreadOnly: boolean) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onSelectNotification?: (item: NotificationItem) => void;
  onClose: () => void;
}

/**
 * Bandeja desplegable de notificaciones in-app con filtro Todas/No leídas,
 * marcado individual/masivo de lectura, eliminación y navegación directa al formulario.
 */
export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  notifications,
  unreadCount,
  unreadOnly,
  loading = false,
  onToggleUnreadOnly,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onSelectNotification,
  onClose,
}) => {
  return (
    <div
      data-testid="notifications-popover"
      role="dialog"
      aria-label="Bandeja de notificaciones"
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        right: 0,
        width: 340,
        maxHeight: 420,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 60,
        overflow: 'hidden',
      }}
    >
      {/* Cabecera */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bell size={14} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Notificaciones
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Marcar todas como leídas"
            >
              <CheckCheck size={13} />
              <span>Marcar todas como leídas</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar notificaciones"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Filtro Todas / No leídas */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '6px 12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          type="button"
          onClick={() => onToggleUnreadOnly(false)}
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 600,
            border: !unreadOnly ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: !unreadOnly ? 'var(--accent-primary-bg)' : 'transparent',
            color: !unreadOnly ? 'var(--accent-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => onToggleUnreadOnly(true)}
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 600,
            border: unreadOnly ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: unreadOnly ? 'var(--accent-primary-bg)' : 'transparent',
            color: unreadOnly ? 'var(--accent-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          No leídas
        </button>
      </div>

      {/* Lista de notificaciones */}
      <div style={{ overflowY: 'auto', maxHeight: 320, display: 'flex', flexDirection: 'column' }}>
        {loading && notifications.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Cargando notificaciones...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '28px 12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            No tienes notificaciones {unreadOnly ? 'pendientes por leer' : 'en tu bandeja'}.
          </div>
        ) : (
          notifications.map((item) => {
            const Icon =
              item.type === 'FORM_NEW_ENTRY'
                ? FileSpreadsheet
                : item.type === 'FORM_ENTRY_RESOLVED'
                ? CheckCircle2
                : Bell;

            return (
              <div
                key={item.id}
                data-testid={`notification-item-${item.id}`}
                onClick={() => {
                  if (!item.read) onMarkAsRead(item.id);
                  onSelectNotification?.(item);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: item.read ? 'transparent' : 'rgba(56, 189, 248, 0.07)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                  <Icon
                    size={15}
                    style={{
                      color: item.read ? 'var(--text-muted)' : 'var(--accent-primary)',
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: item.read ? 500 : 700,
                        color: 'var(--text-main)',
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {item.message}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => onMarkAsRead(item.id)}
                      aria-label={`Marcar como leída ${item.title}`}
                      title="Marcar como leída"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  )}
                  <button
                    type="button"
                    data-testid={`delete-notification-${item.id}`}
                    onClick={() => onDeleteNotification(item.id)}
                    aria-label={`Eliminar notificación ${item.title}`}
                    title="Eliminar notificación"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
