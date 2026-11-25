import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Bell, Check, CheckCheck, ClipboardCheck, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { useToast } from '../../context/useToast';
import {
  useDeleteNotificationMutation,
  useDeleteReadNotificationsMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsListQuery,
} from '../../queries/useNotificationsQueries';
import { queryKeys } from '../../queries/queryKeys';
import { formsService } from '../../services/formsService';
import { formatDate } from '../../utils/formatters';
import type { NotificationItem } from '../../types/notifications';
import type { FormDefinition } from '../../types/forms';
import styles from './NotificationBell.module.css';

/**
 * Propiedades del contenido de la bandeja flotante de notificaciones (`NotificationsPopover`).
 */
export interface NotificationsPopoverProps {
  /** Indica si el popover está abierto (activa la carga bajo demanda). */
  open: boolean;
  /** Cierra el popover (ej. tras navegar a un formulario). */
  onClose: () => void;
  /** Total de notificaciones sin leer actual. */
  unreadCount: number;
}

function isFormNotification(item: NotificationItem): boolean {
  return (
    Boolean(item.resourceId) &&
    (item.type === 'FORM_ENTRY_NEW' ||
      item.type === 'FORM_NEW_ENTRY' ||
      item.type === 'FORM_ENTRY_RESOLVED')
  );
}

/**
 * Contenido de bandeja de notificaciones in-app dentro de Radix Popover:
 * tabs **Todas / No leídas**, acción global **Marcar todas como leídas** (`PATCH /read-all`),
 * marcar individual (`PATCH /:id/read`), eliminar (`DELETE /:id`) y navegación directa
 * a `/folder/:folderId/forms/:formId` resolviendo `folderId` desde el formulario.
 */
export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  open,
  onClose,
  unreadCount,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  const listQuery = useNotificationsListQuery(
    { page: 1, limit: 25, unreadOnly: tab === 'unread' },
    open
  );
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const deleteNotification = useDeleteNotificationMutation();
  const deleteRead = useDeleteReadNotificationsMutation();

  const items = listQuery.data?.data ?? [];
  const hasReadItems = tab === 'all' && items.some((n) => n.read);

  const handleClearRead = async () => {
    try {
      const { deletedCount } = await deleteRead.mutateAsync();
      showToast(
        deletedCount === 1
          ? 'Se eliminó 1 notificación leída.'
          : `Se eliminaron ${deletedCount} notificaciones leídas.`,
        'info'
      );
    } catch {
      showToast('No se pudieron limpiar las notificaciones leídas.', 'error');
    }
  };

  const handleOpenFormNotification = async (item: NotificationItem) => {
    const formId = item.resourceId;
    if (!formId) return;

    if (!item.read) {
      markRead.mutate(item.id);
    }

    setNavigatingId(item.id);
    try {
      const formEntries = queryClient.getQueriesData<FormDefinition[]>({
        queryKey: queryKeys.forms.all,
      });
      const cachedForm = formEntries
        .flatMap(([, list]) => (Array.isArray(list) ? list : []))
        .find((f) => f.id === formId || f.slug === formId);
      let folderId = cachedForm?.folderId ?? null;

      if (!folderId) {
        const detail = await formsService.getForm(formId);
        folderId = detail.folderId ?? null;
      }

      onClose();
      if (folderId) {
        navigate(`/folder/${folderId}/forms/${formId}`);
      } else {
        showToast('No se encontró la carpeta vinculada a este formulario.', 'warning');
      }
    } catch {
      showToast('No se pudo abrir el formulario vinculado a esta notificación.', 'error');
    } finally {
      setNavigatingId(null);
    }
  };

  return (
    <div data-testid="notifications-popover">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>Notificaciones</span>
          {unreadCount > 0 ? (
            <Badge tone="accent" mono>
              {unreadCount}
            </Badge>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<CheckCheck size={14} />}
            onClick={() => markAllRead.mutate()}
            loading={markAllRead.isPending}
            data-testid="notifications-mark-all-btn"
          >
            Marcar todas
          </Button>
        ) : null}
      </div>

      <div className={styles.tabsBar}>
        <Tabs value={tab} onValueChange={(val) => setTab(val as 'all' | 'unread')}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">No leídas</TabsTrigger>
          </TabsList>
        </Tabs>
        {hasReadItems ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={13} />}
            onClick={() => void handleClearRead()}
            loading={deleteRead.isPending}
            data-testid="notifications-clear-read-btn"
          >
            Limpiar leídas
          </Button>
        ) : null}
      </div>

      <div className={styles.list}>
        {listQuery.isLoading ? (
          <div className={styles.empty}>
            <Skeleton variant="line" height={16} />
          </div>
        ) : listQuery.isError ? (
          <div className={styles.empty}>
            <p>No se pudieron cargar las notificaciones.</p>
            <Button variant="secondary" size="sm" onClick={() => void listQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            {tab === 'unread'
              ? 'Estás al día: sin notificaciones sin leer.'
              : 'Aún no tienes notificaciones registradas.'}
          </div>
        ) : (
          items.map((item) => {
            const clickableForm = isFormNotification(item);
            const rowClasses = [
              styles.item,
              !item.read ? styles.itemUnread : '',
              clickableForm && item.read ? styles.itemForm : '',
            ]
              .filter(Boolean)
              .join(' ');

            const innerContent = (
              <>
                <div className={styles.itemTopLine}>
                  {clickableForm ? (
                    <ClipboardCheck size={13} aria-hidden="true" />
                  ) : (
                    <Bell size={13} aria-hidden="true" />
                  )}
                  <span className={styles.itemTitle}>{item.title}</span>
                </div>
                {item.message ? <span className={styles.itemMsg}>{item.message}</span> : null}
                <div className={styles.itemMetaRow}>
                  <span className={styles.itemDate}>{formatDate(item.createdAt)}</span>
                  {clickableForm ? (
                    <span className={styles.navHint}>
                      {navigatingId === item.id ? 'Abriendo...' : 'Abrir formulario'}
                      <ArrowUpRight size={11} aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
              </>
            );

            return (
              <div key={item.id} className={rowClasses} data-testid={`notification-item-${item.id}`}>
                {clickableForm ? (
                  <button
                    type="button"
                    className={styles.itemBodyBtn}
                    disabled={navigatingId === item.id}
                    onClick={() => void handleOpenFormNotification(item)}
                  >
                    {innerContent}
                  </button>
                ) : (
                  <div className={styles.itemBodyStatic}>{innerContent}</div>
                )}

                <div className={styles.itemActions}>
                  {!item.read ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      icon={<Check size={14} />}
                      aria-label={`Marcar "${item.title}" como leída`}
                      onClick={() => markRead.mutate(item.id)}
                    />
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    icon={<Trash2 size={13} />}
                    aria-label={`Eliminar notificación "${item.title}"`}
                    onClick={() => deleteNotification.mutate(item.id)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
