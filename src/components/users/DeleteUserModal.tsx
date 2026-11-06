import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { User } from '../../types/auth';
import styles from './UserModals.module.css';

/**
 * Propiedades del modal de confirmación destructiva para eliminación de usuarios.
 */
export interface DeleteUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (user: User) => Promise<void>;
}

/**
 * Modal de confirmación destructiva que advierte sobre el borrado en cascada
 * de los archivos físicos y registros en PostgreSQL al eliminar un usuario (`DELETE /api/v1/users/:id`).
 */
export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !user) return null;

  /**
   * Ejecuta la eliminación confirmada y cierra el modal al finalizar.
   */
  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirmDelete(user);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Eliminar usuario: ${user.username}`}>
      <div className={styles.form}>
        <div className={styles.alertError} role="alert">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Advertencia de eliminación en cascada:</strong> Eliminar al usuario{' '}
            <strong>{user.username}</strong> destruirá permanentemente su cuenta, sus carpetas y
            todos sus archivos (imágenes y datasets) en el almacenamiento físico del servidor.
          </span>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
          Esta operación no se puede deshacer. ¿Estás seguro de que deseas eliminar este perfil?
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            icon={<Trash2 size={15} />}
            loading={deleting}
            onClick={handleConfirm}
          >
            {deleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

