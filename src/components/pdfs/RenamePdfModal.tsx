import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { pdfsService } from '../../services/pdfsService';
import { useToast } from '../../context/useToast';
import type { PdfItem } from '../../types/media';

/**
 * Propiedades del modal para renombrar un PDF.
 */
export interface RenamePdfModalProps {
  pdf: PdfItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPdfRenamed: (updated: PdfItem) => void;
}

/**
 * Modal para modificar el nombre original de un documento PDF.
 */
export const RenamePdfModal: React.FC<RenamePdfModalProps> = ({
  pdf,
  isOpen,
  onClose,
  onPdfRenamed,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [lastPdfId, setLastPdfId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (pdf && pdf.id !== lastPdfId) {
    setLastPdfId(pdf.id);
    setName(pdf.originalName.replace(/\.pdf$/i, ''));
  }

  if (!isOpen || !pdf) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showToast('El nombre no puede estar vacío', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await pdfsService.renamePdf(pdf.id, cleanName);
      showToast(`Documento renombrado a "${updated.originalName}"`, 'success');
      onPdfRenamed(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al renombrar el documento';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Renombrar Documento PDF">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            htmlFor="pdf-name-input"
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            Nombre del archivo
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              id="pdf-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              style={{
                flex: 1,
                padding: '9px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>.pdf</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!name.trim() || isSubmitting}
            icon={isSubmitting ? undefined : <Check size={14} />}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
