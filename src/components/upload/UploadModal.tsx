import React, { useRef } from 'react';
import { UploadCloud, FolderOpen } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { FolderCategory } from '../../types/media';
import styles from './UploadModal.module.css';

/**
 * Propiedades del modal de subida adaptable según el tipo de la carpeta activa.
 */
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: FileList | File[]) => void;
  folderName?: string;
  folderType?: FolderCategory | null;
}

/**
 * Modal de subida de archivos que ajusta automáticamente los formatos permitidos
 * y etiquetas según el tipo de carpeta activa (`image`, `table`, `pdf` o `container`).
 */
export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onFilesSelected,
  folderName,
  folderType,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      e.target.value = '';
      onFilesSelected(selectedFiles);
      onClose();
    }
  };

  const acceptByFolder =
    folderType === 'image'
      ? 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg'
      : folderType === 'table'
      ? '.csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : folderType === 'pdf'
      ? '.pdf,application/pdf'
      : 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg,.csv,.xlsx,.xls,.pdf,application/pdf';

  const modalTitle =
    folderType === 'image'
      ? 'Subir Imagen'
      : folderType === 'table'
      ? 'Subir Tabla (CSV / Excel)'
      : folderType === 'pdf'
      ? 'Subir Documento PDF'
      : 'Subir Nuevo Archivo';

  const formatsText =
    folderType === 'image'
      ? 'Esta carpeta solo admite imágenes (PNG, JPG, WebP, GIF, SVG)'
      : folderType === 'table'
      ? 'Esta carpeta solo admite hojas de datos (CSV, Excel .xlsx / .xls)'
      : folderType === 'pdf'
      ? 'Esta carpeta solo admite documentos PDF (.pdf)'
      : 'Acepta imágenes (PNG, JPG, WebP), tablas (CSV, XLSX) y documentos PDF';

  if (folderType === 'container') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Carpeta Contenedora">
        <div className={styles.dropArea} style={{ cursor: 'default' }}>
          <div className={styles.icon}>
            <FolderOpen size={28} />
          </div>
          <h4 className={styles.title}>Las carpetas contenedoras solo alojan subcarpetas</h4>
          <p className={styles.formats}>
            Entra o crea una subcarpeta especializada (Imágenes, Tablas o PDF) dentro de &quot;{folderName}&quot; para subir archivos.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptByFolder}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className={styles.dropArea} onClick={() => fileInputRef.current?.click()}>
        <div className={styles.icon}>
          <UploadCloud size={28} />
        </div>
        <h4 className={styles.title}>Haz clic para examinar archivos</h4>
        <p className={styles.formats}>{formatsText}</p>

        {folderName && (
          <span className={styles.folderBadge}>Destino: Carpeta {folderName}</span>
        )}
      </div>
    </Modal>
  );
};
