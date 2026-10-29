import React, { useEffect, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import styles from './DropzoneOverlay.module.css';

interface DropzoneOverlayProps {
  onFilesDropped: (files: FileList) => void;
}

export const DropzoneOverlay: React.FC<DropzoneOverlayProps> = ({ onFilesDropped }) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        onFilesDropped(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFilesDropped]);

  if (!isDragging) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <div className={styles.iconWrapper}>
          <UploadCloud size={36} />
        </div>
        <h3 className={styles.title}>Suelta tus archivos aquí</h3>
        <p className={styles.desc}>
          Las imágenes (.png, .jpg, .webp) y tablas (.csv, .xlsx) se subirán automáticamente.
        </p>
      </div>
    </div>
  );
};
