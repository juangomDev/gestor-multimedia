import React, { useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { pdfsService } from '../../services/pdfsService';
import { formatBytes } from '../../utils/formatters';
import { useToast } from '../../context/useToast';
import type { PdfItem } from '../../types/media';

/**
 * Propiedades del modal de reemplazo binario Hot-Swap para PDFs.
 */
export interface HotSwapPdfModalProps {
  pdf: PdfItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPdfSwapped: (updated: PdfItem) => void;
}

/**
 * Modal para sustituir el archivo físico del PDF conservando ID, shortCode y URL pública.
 */
export const HotSwapPdfModal: React.FC<HotSwapPdfModalProps> = ({
  pdf,
  isOpen,
  onClose,
  onPdfSwapped,
}) => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !pdf) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
      showToast('Solo se admiten documentos en formato PDF (.pdf)', 'error');
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      showToast('El archivo excede el límite máximo de 50 MB', 'error');
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    try {
      const updated = await pdfsService.hotSwapPdf(pdf.id, file);
      showToast('Archivo reemplazado en caliente exitosamente', 'success');
      onPdfSwapped(updated);
      onClose();
      setFile(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reemplazar el PDF';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reemplazo en Caliente (Hot-Swap)">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'rgba(245, 158, 11, 0.08)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            fontSize: '0.8125rem',
            color: '#f59e0b',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>
            Se sustituirán los artefactos en disco sin cambiar el shortCode <strong>/p/{pdf.shortCode}</strong>.
            Cualquier enlace público o integración existente permanecerá intacta.
          </span>
        </div>

        <div
          style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 16px',
            textAlign: 'center',
            position: 'relative',
            background: file ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-card)',
            cursor: 'pointer',
          }}
        >
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
            title="Seleccionar nuevo archivo PDF"
          />

          <RefreshCw size={28} style={{ color: 'var(--accent-primary)', marginBottom: 8 }} />

          {file ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {file.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {formatBytes(file.size)}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Selecciona la versión actualizada del PDF
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Actual: {pdf.originalName} ({formatBytes(pdf.sizeBytes)})
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!file || isSubmitting}
            icon={isSubmitting ? undefined : <RefreshCw size={14} />}
          >
            {isSubmitting ? 'Sustituyendo binario...' : 'Confirmar Reemplazo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

