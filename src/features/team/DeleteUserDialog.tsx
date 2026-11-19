import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/useToast';
import { useDeleteUserMutation } from '../../queries/useAdminQueries';
import type { User } from '../../types/auth';
import styles from './TeamDialogs.module.css';

/**
 * Propiedades del modal de confirmación de borrado en cascada de usuario (`DeleteUserDialog`).
 */
export interface DeleteUserDialogProps {
  /** Usuario a eliminar permanentemente. */
  targetUser: User | null;
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal de confirmación para eliminar una cuenta y sus activos en cascada
 * (`DELETE /api/v1/users/:id`).
 */
export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({
  targetUser,
  open,
  onOpenChange,
}) => {
  const { showToast } = useToast();
  const deleteUser = useDeleteUserMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) setErrorMsg(null);
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!targetUser) return;
    setErrorMsg(null);
    try {
      await deleteUser.mutateAsync(targetUser.id);
      showToast(`Usuario "${targetUser.username}" eliminado permanentemente.`, 'info');
      handleClose(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo eliminar el usuario.';
      setErrorMsg(detail || fallback);
    }
  };

  return (
    <Dialog
      open={open && Boolean(targetUser)}
      onOpenChange={handleClose}
      title="Eliminar usuario en cascada"
      description={
        targetUser ? `Acción destructiva sobre la cuenta "${targetUser.username}".` : undefined
      }
      size="sm"
      footer={
        <div className={styles.footerActions}>
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={deleteUser.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={14} />}
            loading={deleteUser.isPending}
            onClick={() => void handleConfirm()}
            data-testid="delete-user-confirm-btn"
          >
            Eliminar permanentemente
          </Button>
        </div>
      }
    >
      <div className={styles.form}>
        <div className={styles.warningBox} role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            Al eliminar a <strong>{targetUser?.username}</strong>, se borrarán en cascada sus
            carpetas propias, imágenes, tablas, PDFs y membresías compartidas. Esta acción no se
            puede deshacer.
          </span>
        </div>

        {errorMsg ? (
          <div className={styles.errorBox} role="alert">
            {errorMsg}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
};
