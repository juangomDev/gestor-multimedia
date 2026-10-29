import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { Modal } from '../common/Modal';
import styles from './UploadModal.module.css';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: FileList) => void;
  folderName?: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onFilesSelected,
  folderName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Subir Nuevo Archivo">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,.csv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className={styles.dropArea} onClick={() => fileInputRef.current?.click()}>
        <div className={styles.icon}>
          <UploadCloud size={28} />
        </div>
        <h4 className={styles.title}>Haz clic para examinar archivos</h4>
        <p className={styles.formats}>
          Acepta imágenes (PNG, JPG, WebP) y hojas de datos (CSV, Excel XLSX)
        </p>

        {folderName && (
          <span className={styles.folderBadge}>Destino: Carpeta {folderName}</span>
        )}
      </div>
    </Modal>
  );
};
