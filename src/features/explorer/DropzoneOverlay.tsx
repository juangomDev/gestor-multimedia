import React from 'react';
import { ShieldAlert, Upload } from 'lucide-react';
import styles from './DropzoneOverlay.module.css';

/**
 * Propiedades del overlay visual de arrastre de archivos (`DropzoneOverlay`).
 */
export interface DropzoneOverlayProps {
  visible: boolean;
  canUpload: boolean;
  folderName?: string;
  formatsLabel?: string;
  blockedReason?: string;
}

/**
 * Capa visual no intrusiva durante arrastre de archivos (`Drag & Drop`).
 * Confirma el destino cuando la carpeta admite subida o advierte claramente si está bloqueada.
 */
export const DropzoneOverlay: React.FC<DropzoneOverlayProps> = ({
  visible,
  canUpload,
  folderName,
  formatsLabel,
  blockedReason,
}) => {
  if (!visible) return null;

  return (
    <div className={styles.overlay} role="status" aria-live="polite" data-testid="dropzone-overlay">
      <div className={`${styles.panel} ${!canUpload ? styles.panelBlocked : ''}`}>
        {canUpload ? (
          <>
            <Upload size={26} className={styles.icon} aria-hidden="true" />
            <span className={styles.title}>Soltar para subir a &ldquo;{folderName}&rdquo;</span>
            <span className={styles.subtitle}>
              Formatos aceptados en esta carpeta: {formatsLabel}.
            </span>
          </>
        ) : (
          <>
            <ShieldAlert size={26} className={styles.iconBlocked} aria-hidden="true" />
            <span className={styles.title}>Subida no disponible aquí</span>
            <span className={styles.subtitle}>
              {blockedReason ||
                'Entra a una carpeta de Imágenes, Tablas o PDF con permiso de edición para soltar archivos.'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
