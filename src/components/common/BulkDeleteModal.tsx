import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

/**
 * Propiedades del modal de confirmación para eliminación masiva en lote.
 */
export interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  itemLabel?: string;
  onConfirm: () => Promise<void>;
}

/**
 * Modal de confirmación destructiva para eliminar en lote múltiples imágenes o datasets
 * (`POST /api/v1/images/bulk-delete` o `POST /api/v1/tables/bulk-delete`).
 */
export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  itemLabel = 'elementos',
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleExecute = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Eliminar ${selectedCount} ${itemLabel} en lote`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            fontSize: '0.85rem',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <span>
            <strong>Advertencia:</strong> Esta acción eliminará permanentemente{' '}
            <strong>{selectedCount}</strong> {itemLabel} tanto en la base de datos como en el
            almacenamiento físico del servidor. Esta operación no se puede deshacer.
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          ¿Estás seguro de que deseas continuar con la eliminación masiva?
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={isDeleting}
            icon={<Trash2 size={16} />}
            onClick={handleExecute}
          >
            Eliminar {selectedCount} {itemLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

