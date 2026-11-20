import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/Popover';
import { useUnreadNotificationsCountQuery } from '../../queries/useNotificationsQueries';
import { NotificationsPopover } from './NotificationsPopover';
import styles from './NotificationBell.module.css';

/**
 * Campana de notificaciones editorial con insignia numérica tabular y Radix Popover.
 * Delega la bandeja completa (`Todas / No leídas`, marcar leídas, eliminar y salto directo
 * a formularios) en `NotificationsPopover`.
 */
export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const unreadQuery = useUnreadNotificationsCountQuery();
  const unreadCount = unreadQuery.data ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={styles.triggerWrap}
          icon={<Bell size={17} />}
          aria-label={
            unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'
          }
          data-testid="notification-bell-trigger"
        >
          {unreadCount > 0 ? (
            <span
              className={styles.badgeCount}
              aria-hidden="true"
              data-testid="notification-bell-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className={styles.popover}>
        <NotificationsPopover
          open={open}
          onClose={() => setOpen(false)}
          unreadCount={unreadCount}
        />
      </PopoverContent>
    </Popover>
  );
};
