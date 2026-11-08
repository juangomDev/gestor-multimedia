import React, { useState } from 'react';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { pdfsService } from '../../services/pdfsService';
import { formatBytes } from '../../utils/formatters';
import { useToast } from '../../context/useToast';
import type { PdfItem } from '../../types/media';

/**
 * Propiedades del modal de subida de documentos PDF.
 */
export interface UploadPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId?: string | null;
  folderName?: string;
  onPdfUploaded: (pdf: PdfItem) => void;
}

/**
 * Modal para la carga multipart de archivos PDF con validación de extensión y tamaño.
 */
export const UploadPdfModal: React.FC<UploadPdfModalProps> = ({
  isOpen,
  onClose,
  folderId,
  folderName,
  onPdfUploaded,
}) => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

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

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    try {
      const created = await pdfsService.uploadPdf(file, folderId);
      showToast(`Documento "${created.originalName}" subido exitosamente`, 'success');
      onPdfUploaded(created);
      onClose();
      setFile(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir el documento PDF';
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Subir Documento PDF">
      <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {folderName && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-panel)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}
          >
            Destino: <strong>{folderName}</strong>
          </div>
        )}

        <div
          style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            background: file ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-card)',
            cursor: 'pointer',
            position: 'relative',
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
            title="Seleccionar archivo PDF"
          />

          <UploadCloud size={32} style={{ color: 'var(--accent-primary)' }} />

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
            <>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Selecciona o arrastra un archivo PDF
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Máximo 50 MB. Se extraerá texto y se generará doble artefacto automáticamente.
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!file || isUploading}
            icon={isUploading ? undefined : <CheckCircle2 size={15} />}
          >
            {isUploading ? 'Procesando PDF...' : 'Subir Documento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

