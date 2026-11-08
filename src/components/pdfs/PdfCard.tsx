import React from 'react';
import {
  FileText,
  Copy,
  Check,
  Eye,
  FileEdit,
  RefreshCw,
  FolderInput,
  Trash2,
  Bookmark,
  ScanText,
} from 'lucide-react';
import { formatBytes } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/useToast';
import type { PdfItem } from '../../types/media';
import styles from './PdfCard.module.css';

/**
 * Propiedades del componente de tarjeta para documentos PDF.
 */
export interface PdfCardProps {
  pdf: PdfItem;
  onOpenViewer: (pdf: PdfItem) => void;
  onOpenRename?: (pdf: PdfItem) => void;
  onOpenHotSwap?: (pdf: PdfItem) => void;
  onOpenMetadata?: (pdf: PdfItem) => void;
  onMoveToFolder?: (pdf: PdfItem) => void;
  onDelete?: (pdf: PdfItem) => void;
}

/**
 * Tarjeta interactiva para representar documentos PDF en el catálogo.
 * Muestra insignias de páginas, OCR escaneado, ficha técnica y atajos de gestión.
 */
export const PdfCard: React.FC<PdfCardProps> = ({
  pdf,
  onOpenViewer,
  onOpenRename,
  onOpenHotSwap,
  onOpenMetadata,
  onMoveToFolder,
  onDelete,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  /**
   * Copia la Capability URL canónica (`/p/:shortCode`) al portapapeles.
   */
  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(pdf.url);
    if (ok) {
      setCopied(true);
      showToast('Enlace corto copiado', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={styles.card}
      data-testid={`pdf-card-${pdf.id}`}
      onClick={() => onOpenViewer(pdf)}
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <FileText size={22} />
        </div>

        <div className={styles.titleArea}>
          <span className={styles.pdfName} title={pdf.originalName}>
            {pdf.originalName}
          </span>

          <div className={styles.shortCodeRow}>
            <code className={styles.shortCode}>/p/{pdf.shortCode}</code>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={handleCopyLink}
              title="Copiar enlace corto"
              aria-label="Copiar enlace corto"
            >
              {copied ? <Check size={13} style={{ color: 'var(--color-success)' }} /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.badgesRow}>
        <span className={styles.badge}>{pdf.pageCount} {pdf.pageCount === 1 ? 'pág' : 'págs'}</span>
        <span className={styles.badge}>{formatBytes(pdf.sizeBytes)}</span>

        {pdf.isScanned && (
          <span className={`${styles.badge} ${styles.badgeScanned}`} title="Documento escaneado / OCR">
            <ScanText size={11} style={{ display: 'inline', marginRight: 3 }} />
            OCR
          </span>
        )}

        {pdf.metadataCard && (
          <span
            className={`${styles.badge} ${styles.badgeMetadata}`}
            title={pdf.metadataCard.summary || pdf.metadataCard.category || 'Ficha semántica activa'}
          >
            <Bookmark size={11} style={{ display: 'inline', marginRight: 3 }} />
            {pdf.metadataCard.category || 'Ficha'}
          </span>
        )}
      </div>

      <div className={styles.footer} onClick={(e) => e.stopPropagation()}>
        <span className={styles.metaInfo}>
          {new Date(pdf.createdAt).toLocaleDateString()}
        </span>

        <div className={styles.actionsGroup}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onOpenViewer(pdf)}
            title="Abrir visor interactivo"
            aria-label="Abrir visor"
          >
            <Eye size={15} />
          </button>

          {onOpenMetadata && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => onOpenMetadata(pdf)}
              title="Editar ficha técnica semántica"
              aria-label="Editar ficha técnica"
            >
              <Bookmark size={15} />
            </button>
          )}

          {onOpenRename && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => onOpenRename(pdf)}
              title="Renombrar PDF"
              aria-label="Renombrar archivo"
            >
              <FileEdit size={15} />
            </button>
          )}

          {onOpenHotSwap && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => onOpenHotSwap(pdf)}
              title="Reemplazo en caliente (Hot-Swap)"
              aria-label="Reemplazar archivo"
            >
              <RefreshCw size={15} />
            </button>
          )}

          {onMoveToFolder && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => onMoveToFolder(pdf)}
              title="Mover a otra carpeta"
              aria-label="Mover a carpeta"
            >
              <FolderInput size={15} />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onClick={() => onDelete(pdf)}
              title="Eliminar permanentemente"
              aria-label="Eliminar PDF"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

