import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Trash2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { foldersService } from '../../services/foldersService';
import { usersService } from '../../services/usersService';
import { storageService } from '../../services/storageService';
import { useToast } from '../../context/useToast';
import type { FolderItem } from '../../types/media';
import type { ApiFolderShare } from '../../types/api';
import type { User } from '../../types/auth';
import styles from './CreateFolderModal.module.css';

/**
 * Propiedades del modal de compartición RBAC de carpetas (`ShareFolderModal`).
 */
export interface ShareFolderModalProps {
  folder: FolderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSharesChanged?: () => void;
}

/**
 * Modal para compartir una carpeta con colaboradores (`POST /api/v1/folders/:id/shares`),
 * alternar permisos en línea (`Lectura` <-> `Edición`) y revocar accesos (`DELETE`).
 */
export const ShareFolderModal: React.FC<ShareFolderModalProps> = ({
  folder,
  isOpen,
  onClose,
  onSharesChanged,
}) => {
  const { showToast } = useToast();

  const [shares, setShares] = useState<ApiFolderShare[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [initialPermission, setInitialPermission] = useState<'READ' | 'EDIT'>('READ');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !folder) return;
    let active = true;

    Promise.allSettled([foldersService.listShares(folder.id), usersService.listUsers()]).then(
      ([sharesRes, usersRes]) => {
        if (!active) return;

        const loadedShares =
          sharesRes.status === 'fulfilled' ? sharesRes.value : [];
        const loadedUsers =
          usersRes.status === 'fulfilled'
            ? usersRes.value
            : storageService.getCreatedUsers();

        setShares(loadedShares);
        setAvailableUsers(loadedUsers);
        setError(null);
      }
    );

    return () => {
      active = false;
    };
  }, [isOpen, folder]);

  if (!isOpen || !folder) return null;

  const sharedUserIds = new Set(shares.map((s) => s.userId || s.user?.id).filter(Boolean));
  const candidateUsers = availableUsers.filter(
    (u) => u.id !== folder.userId && !sharedUserIds.has(u.id)
  );

  /**
   * Asigna acceso compartido al colaborador seleccionado (`POST /api/v1/folders/:id/shares`).
   */
  const handleAddShare = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUserId = selectedUserId || candidateUsers[0]?.id;
    if (!targetUserId) {
      setError('Selecciona un colaborador para compartir la carpeta.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const targetUser = availableUsers.find((u) => u.id === targetUserId);
      const createdShare = await foldersService.shareFolder(
        folder.id,
        targetUserId,
        initialPermission
      );
      const enrichedShare: ApiFolderShare = {
        ...createdShare,
        userId: createdShare?.userId || targetUserId,
        permission: createdShare?.permission || initialPermission,
        user: createdShare?.user || {
          id: targetUserId,
          username: targetUser?.username || targetUserId,
          role: targetUser?.role || 'COLLABORATOR',
        },
      };

      setShares((prev) => [...prev, enrichedShare]);
      setSelectedUserId('');
      showToast(
        `Carpeta compartida con '${enrichedShare.user?.username || targetUserId}'`,
        'success'
      );
      onSharesChanged?.();
    } catch (err: any) {
      setError(err?.detail || err?.message || 'No se pudo compartir la carpeta.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Actualiza en línea el nivel de permiso (`READ` <-> `EDIT`) de un miembro activo.
   */
  const handlePermissionChange = async (
    share: ApiFolderShare,
    nextPermission: 'READ' | 'EDIT'
  ) => {
    const uid = share.userId || share.user?.id;
    if (!uid) return;

    try {
      await foldersService.updateSharePermission(folder.id, uid, nextPermission);
      setShares((prev) =>
        prev.map((item) =>
          (item.userId || item.user?.id) === uid
            ? { ...item, permission: nextPermission }
            : item
        )
      );
      showToast(
        `Permiso actualizado a ${nextPermission === 'EDIT' ? 'Edición' : 'Lectura'}`,
        'info'
      );
      onSharesChanged?.();
    } catch (err: any) {
      showToast(err?.detail || err?.message || 'Error al cambiar permiso', 'error');
    }
  };

  /**
   * Revoca y expulsa el acceso de un colaborador (`DELETE /api/v1/folders/:id/shares/:userId`).
   */
  const handleRevoke = async (share: ApiFolderShare) => {
    const uid = share.userId || share.user?.id;
    if (!uid) return;
    const uname = share.user?.username || uid;

    try {
      await foldersService.revokeShare(folder.id, uid);
      setShares((prev) => prev.filter((item) => (item.userId || item.user?.id) !== uid));
      showToast(`Acceso revocado para '${uname}'`, 'info');
      onSharesChanged?.();
    } catch (err: any) {
      showToast(err?.detail || err?.message || 'Error al revocar acceso', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Compartir carpeta: ${folder.name}`}>
      <div className={styles.form}>
        {error && (
          <div className={styles.alertError} role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAddShare} className={styles.field}>
          <label htmlFor="share-user-select" className={styles.label}>
            Invitar colaborador disponible
          </label>
          <div className={styles.shareAddRow}>
            <select
              id="share-user-select"
              aria-label="Seleccionar usuario colaborador"
              className={styles.select}
              style={{ flex: 1 }}
              value={selectedUserId || candidateUsers[0]?.id || ''}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={submitting || candidateUsers.length === 0}
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
              disabled={submitting || candidateUsers.length === 0}
            >
              <option value="READ">Lectura (READ)</option>
              <option value="EDIT">Edición (EDIT)</option>
            </select>

            <Button
              type="submit"
              variant="primary"
              icon={<UserPlus size={15} />}
              disabled={submitting || candidateUsers.length === 0}
              loading={submitting}
            >
              Compartir
            </Button>
          </div>
        </form>

        <div className={styles.field}>
          <span className={styles.label}>
            Miembros con acceso activo ({shares.length})
          </span>

          {shares.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              Esta carpeta aún no se ha compartido con ningún colaborador.
            </div>
          ) : (
            <div className={styles.membersList}>
              {shares.map((share) => {
                const uid = share.userId || share.user?.id || 'unknown';
                const uname =
                  share.user?.username ||
                  availableUsers.find((u) => u.id === uid)?.username ||
                  uid;

                return (
                  <div
                    key={share.id || uid}
                    className={styles.memberItem}
                    data-testid={`share-member-${uname}`}
                  >
                    <div className={styles.memberLeft}>
                      <Users size={15} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{uname}</span>
                    </div>

                    <div className={styles.memberRight}>
                      <select
                        aria-label={`Cambiar permiso de ${uname}`}
                        className={styles.select}
                        style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                        value={share.permission || 'READ'}
                        onChange={(e) =>
                          handlePermissionChange(share, e.target.value as 'READ' | 'EDIT')
                        }
                      >
                        <option value="READ">Lectura</option>
                        <option value="EDIT">Edición</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRevoke(share)}
                        className={styles.iconBtn}
                        style={{ color: 'var(--color-danger)' }}
                        title={`Revocar acceso a ${uname}`}
                        aria-label={`Revocar acceso a ${uname}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

