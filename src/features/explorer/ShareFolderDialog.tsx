import React, { useState } from 'react';
import { Bot, Trash2, UserPlus, Users } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/useToast';
import {
  useFolderSharesQuery,
  useRevokeShareMutation,
  useShareFolderMutation,
  useUpdateSharePermissionMutation,
} from '../../queries/useFoldersQueries';
import { useUsersQuery } from '../../queries/useAdminQueries';
import { AI_MANAGER_USERNAME } from './explorerRules';
import type { ApiFolderShare } from '../../types/api';
import type { FolderItem } from '../../types/media';
import styles from './ShareFolderDialog.module.css';

/**
 * Propiedades del diálogo de compartición RBAC y publicación `ai_manager` (`ShareFolderDialog`).
 */
export interface ShareFolderDialogProps {
  folder: FolderItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isAiShare(share: ApiFolderShare, aiUserId?: string): boolean {
  return (
    share.user?.username === AI_MANAGER_USERNAME ||
    Boolean(aiUserId && (share.userId || share.user?.id) === aiUserId)
  );
}

/**
 * Gestión de membresías (`/folders/:id/shares`) con interruptor de 1 clic para
 * publicar/retirar la carpeta en el Widget de Chat Web Público (`ai_manager` en `READ`),
 * excluyendo a `ai_manager` del selector de colaboradores.
 */
export const ShareFolderDialog: React.FC<ShareFolderDialogProps> = ({
  folder,
  open,
  onOpenChange,
}) => {
  const { showToast } = useToast();
  const folderId = folder?.id ?? '';

  const sharesQuery = useFolderSharesQuery(folder?.id, open);
  const usersQuery = useUsersQuery(open);
  const shareMutation = useShareFolderMutation(folderId);
  const updatePermMutation = useUpdateSharePermissionMutation(folderId);
  const revokeMutation = useRevokeShareMutation(folderId);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [initialPermission, setInitialPermission] = useState<'READ' | 'EDIT'>('READ');

  const shares = sharesQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const aiShare = shares.find((s) => isAiShare(s));
  const aiUser = users.find((u) => u.username === AI_MANAGER_USERNAME);
  const aiUserId = aiUser?.id || aiShare?.userId || aiShare?.user?.id;
  const isPublishedToAi = shares.some((s) => isAiShare(s, aiUserId));

  const sharedIds = new Set(shares.map((s) => s.userId || s.user?.id).filter(Boolean));
  const candidateUsers = users.filter(
    (u) =>
      u.id !== folder?.userId &&
      !sharedIds.has(u.id) &&
      u.username !== AI_MANAGER_USERNAME
  );

  const effectiveTargetUserId =
    selectedUserId && candidateUsers.some((u) => u.id === selectedUserId)
      ? selectedUserId
      : candidateUsers[0]?.id ?? '';

  const handleToggleAiPublish = async (nextChecked: boolean) => {
    if (!aiUserId || !folder) return;
    try {
      if (nextChecked) {
        await shareMutation.mutateAsync({ userId: aiUserId, permission: 'READ' });
        showToast('Carpeta publicada en el Widget de Chat Web Público', 'success');
      } else {
        await revokeMutation.mutateAsync(aiUserId);
        showToast('Carpeta retirada del Widget de Chat Web Público', 'info');
      }
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      showToast(detail || message || 'No se pudo actualizar la publicación pública.', 'error');
    }
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!effectiveTargetUserId || !folder) return;
    try {
      await shareMutation.mutateAsync({
        userId: effectiveTargetUserId,
        permission: initialPermission,
      });
      setSelectedUserId('');
      showToast('Acceso compartido concedido', 'success');
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      showToast(detail || message || 'No se pudo compartir la carpeta.', 'error');
    }
  };

  const handlePermissionChange = async (userId: string, permission: 'READ' | 'EDIT') => {
    try {
      await updatePermMutation.mutateAsync({ userId, permission });
      showToast(
        `Permiso actualizado a ${permission === 'EDIT' ? 'Edición' : 'Lectura'}`,
        'info'
      );
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      showToast(detail || message || 'Error al actualizar permiso.', 'error');
    }
  };

  const handleRevoke = async (userId: string, username: string) => {
    try {
      await revokeMutation.mutateAsync(userId);
      showToast(`Acceso revocado para "${username}"`, 'info');
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      showToast(detail || message || 'Error al revocar acceso.', 'error');
    }
  };

  const aiBusy = shareMutation.isPending || revokeMutation.isPending;

  return (
    <Dialog
      open={open && Boolean(folder)}
      onOpenChange={onOpenChange}
      title={folder ? `Compartir "${folder.name}"` : 'Compartir carpeta'}
      description="Administra colaboradores con permiso de lectura/edición y publicación en el chat público."
      size="md"
    >
      <div className={styles.stack}>
        <div
          className={`${styles.aiBox} ${isPublishedToAi ? styles.aiBoxActive : ''}`}
          data-testid="ai-publish-box"
        >
          <div className={styles.aiInfo}>
            <Bot size={17} className={styles.aiIcon} aria-hidden="true" />
            <div>
              <span className={styles.aiTitle}>
                Publicar en Widget de Chat Web Público (ai_manager)
              </span>
              <span className={styles.aiSub}>
                {!aiUserId
                  ? 'Cuenta de servicio ai_manager no disponible en el directorio.'
                  : isPublishedToAi
                  ? 'Activa · Accesible en modo Lectura (READ) para consultas públicas.'
                  : 'Inactiva · Solo visible para usuarios internos autorizados.'}
              </span>
            </div>
          </div>
          <Switch
            checked={isPublishedToAi}
            onCheckedChange={(checked) => void handleToggleAiPublish(checked)}
            disabled={!aiUserId || aiBusy}
            ariaLabel="Publicar en Widget de Chat Web Público (ai_manager)"
          />
        </div>

        <form onSubmit={handleInvite} className={styles.inviteForm}>
          <label htmlFor="share-collaborator-select" className={styles.label}>
            Invitar colaborador
          </label>
          <div className={styles.inviteRow}>
            <select
              id="share-collaborator-select"
              aria-label="Seleccionar colaborador"
              className={`${styles.select} ${styles.selectGrow}`}
              value={effectiveTargetUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={candidateUsers.length === 0 || shareMutation.isPending}
            >
              {candidateUsers.length === 0 ? (
                <option value="">Sin colaboradores disponibles</option>
              ) : (
                candidateUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role})
                  </option>
                ))
              )}
            </select>

            <select
              aria-label="Permiso inicial"
              className={styles.select}
              value={initialPermission}
              onChange={(e) => setInitialPermission(e.target.value as 'READ' | 'EDIT')}
              disabled={candidateUsers.length === 0 || shareMutation.isPending}
            >
              <option value="READ">Lectura (READ)</option>
              <option value="EDIT">Edición (EDIT)</option>
            </select>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<UserPlus size={14} />}
              disabled={!effectiveTargetUserId}
              loading={shareMutation.isPending}
            >
              Compartir
            </Button>
          </div>
        </form>

        <div className={styles.inviteForm}>
          <span className={styles.label}>Miembros activos ({shares.length})</span>
          {sharesQuery.isLoading ? (
            <Skeleton variant="card" height={72} />
          ) : shares.length === 0 ? (
            <div className={styles.emptyMembers}>
              Esta carpeta todavía no está compartida con ningún usuario.
            </div>
          ) : (
            <div className={styles.membersList}>
              {shares.map((share) => {
                const uid = share.userId || share.user?.id || '';
                const uname =
                  share.user?.username || users.find((u) => u.id === uid)?.username || uid;
                const isAi = isAiShare(share, aiUserId);

                return (
                  <div key={share.id || uid} className={styles.memberRow}>
                    <div className={styles.memberInfo}>
                      {isAi ? <Bot size={15} aria-hidden="true" /> : <Users size={15} aria-hidden="true" />}
                      <span className={styles.memberName}>{uname}</span>
                      {isAi ? (
                        <Badge tone="ok" mono>
                          CHAT PÚBLICO
                        </Badge>
                      ) : null}
                    </div>

                    <div className={styles.memberControls}>
                      {!isAi ? (
                        <select
                          aria-label={`Permiso de ${uname}`}
                          className={styles.select}
                          value={share.permission || 'READ'}
                          onChange={(e) =>
                            void handlePermissionChange(uid, e.target.value as 'READ' | 'EDIT')
                          }
                        >
                          <option value="READ">Lectura</option>
                          <option value="EDIT">Edición</option>
                        </select>
                      ) : (
                        <Badge mono>READ</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={<Trash2 size={14} />}
                        aria-label={`Revocar acceso a ${uname}`}
                        onClick={() => void handleRevoke(uid, uname)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
