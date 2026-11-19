import React, { useState } from 'react';
import { FolderInput, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ShortCodeChip } from '../../components/ui/ShortCodeChip';
import { formatBytes, formatDate } from '../../utils/formatters';
import type { ImageItem } from '../../types/media';
import styles from './ImageInspectorDialog.module.css';

/**
 * Propiedades del panel lateral de metadatos y acciones de `ImageInspectorDialog`.
 */
export interface ImageInspectorSidebarProps {
  /** Código corto activo (`/i/:shortCode`). */
  shortCode: string;
  /** URL canónica copiable de la imagen. */
  canonicalUrl: string;
  /** Registro completo opcional de la imagen. */
  image?: ImageItem;
  /** Ancho medido o registrado en píxeles. */
  width: number | null;
  /** Alto medido o registrado en píxeles. */
  height: number | null;
  /** Habilita acciones mutadoras (`EDIT`/`ADMIN`). */
  canMutate: boolean;
  /** Indica si existe árbol de carpetas para ofrecer "Mover a carpeta". */
  canMove: boolean;
  /** Indica si la eliminación está en curso. */
  isDeleting: boolean;
  onOpenRename: () => void;
  onOpenHotSwap: () => void;
  onOpenMove: () => void;
  onConfirmDelete: () => Promise<void>;
}

/**
 * Panel lateral derecho del Inspector de Imágenes con `ShortCodeChip`, detalles técnicos
 * en `tabular-nums` y accesos a Renombrar, Hot-Swap, Mover y Eliminar con confirmación inline.
 */
export const ImageInspectorSidebar: React.FC<ImageInspectorSidebarProps> = ({
  shortCode,
  canonicalUrl,
  image,
  width,
  height,
  canMutate,
  canMove,
  isDeleting,
  onOpenRename,
  onOpenHotSwap,
  onOpenMove,
  onConfirmDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <aside className={styles.aside} aria-label="Metadatos de la imagen">
      <div className={styles.asideSection}>
        <span className={styles.sectionLabel}>Enlace corto</span>
        <ShortCodeChip prefix="i" shortCode={shortCode} copyValue={canonicalUrl} />
      </div>

      <div className={styles.asideSection}>
        <span className={styles.sectionLabel}>Detalles técnicos</span>
        <dl className={styles.metaList}>
          <div className={styles.metaRow}>
            <dt className={styles.metaKey}>Dimensiones</dt>
            <dd className={styles.metaValue}>
              {width && height ? `${width} × ${height} px` : '—'}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaKey}>Peso</dt>
            <dd className={styles.metaValue}>{image ? formatBytes(image.sizeBytes) : '—'}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaKey}>Tipo MIME</dt>
            <dd className={styles.metaValue}>{image?.mimeType || '—'}</dd>
          </div>
          {image?.createdAt ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaKey}>Subida</dt>
              <dd className={styles.metaValue}>{formatDate(image.createdAt)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {canMutate ? (
        <div className={styles.actionStack}>
          <span className={styles.sectionLabel}>Acciones</span>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            icon={<Pencil size={14} />}
            onClick={onOpenRename}
          >
            Renombrar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            icon={<RefreshCw size={14} />}
            onClick={onOpenHotSwap}
          >
            Reemplazar (Hot-Swap)
          </Button>
          {canMove ? (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              icon={<FolderInput size={14} />}
              onClick={onOpenMove}
            >
              Mover a carpeta
            </Button>
          ) : null}

          {confirmDelete ? (
            <div className={styles.deleteBox}>
              <p className={styles.deleteText}>
                ¿Eliminar permanentemente esta imagen? Sus enlaces dejarán de responder.
              </p>
              <div className={styles.deleteBtns}>
                <Button
                  variant="danger"
                  size="sm"
                  loading={isDeleting}
                  onClick={() => void onConfirmDelete()}
                >
                  Confirmar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="danger"
              size="sm"
              fullWidth
              icon={<Trash2 size={14} />}
              onClick={() => setConfirmDelete(true)}
            >
              Eliminar imagen
            </Button>
          )}
        </div>
      ) : null}
    </aside>
  );
};
