import React, { useState } from 'react';
import { Download, Image as ImageIcon, Table2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { storageService } from '../../services/storageService';
import { cleanBaseUrl } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import type { MediaCategory, ImageItem, TableItem } from '../../types/media';
import styles from './ImportShortCodeModal.module.css';

interface ImportShortCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: () => void;
  folderId?: string | null;
}

export const ImportShortCodeModal: React.FC<ImportShortCodeModalProps> = ({
  isOpen,
  onClose,
  onImported,
  folderId,
}) => {
  const { showToast } = useToast();
  const [shortCode, setShortCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MediaCategory>('image');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = shortCode.trim();
    if (!code) {
      showToast('Por favor introduce un shortCode válido', 'error');
      return;
    }

    const base = cleanBaseUrl(storageService.getConfig().baseUrl);

    if (category === 'image') {
      const newItem: ImageItem = {
        id: `import-${Date.now()}`,
        shortCode: code,
        originalName: name.trim() || `imagen-${code}.png`,
        mimeType: 'image/png',
        sizeBytes: 0,
        url: `${base}/i/${code}`,
        createdAt: new Date().toISOString(),
        folderId: folderId || null,
      };
      storageService.addImage(newItem);
      showToast(`Imagen '${newItem.originalName}' importada`, 'success');
    } else {
      const newItem: TableItem = {
        id: `import-${Date.now()}`,
        shortCode: code,
        tableName: name.trim() || `tabla-${code}.csv`,
        rowCount: 0,
        sizeBytes: 0,
        url: `${base}/t/${code}`,
        createdAt: new Date().toISOString(),
        folderId: folderId || null,
      };
      storageService.addTable(newItem);
      showToast(`Dataset '${newItem.tableName}' importado`, 'success');
    }

    setShortCode('');
    setName('');
    onImported?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar Recurso por ShortCode">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <span className={styles.label}>Tipo de Recurso</span>
          <div className={styles.typeSelector}>
            <button
              type="button"
              className={`${styles.typeBtn} ${category === 'image' ? styles.active : ''}`}
              onClick={() => setCategory('image')}
            >
              <ImageIcon size={16} />
              <span>Imagen</span>
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${category === 'table' ? styles.active : ''}`}
              onClick={() => setCategory('table')}
            >
              <Table2 size={16} />
              <span>Tabla / Dataset</span>
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="import-shortcode" className={styles.label}>
            ShortCode (Código Corto)
          </label>
          <input
            id="import-shortcode"
            type="text"
            className={styles.input}
            placeholder="ej. 7xK9mP2vQ1"
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="import-name" className={styles.label}>
            Nombre personalizado (opcional)
          </label>
          <input
            id="import-name"
            type="text"
            className={styles.input}
            style={{ fontFamily: 'var(--font-sans)' }}
            placeholder={category === 'image' ? 'ej. diagrama-cluster.png' : 'ej. reporte-ods.csv'}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" icon={<Download size={16} />}>
            Importar al Catálogo
          </Button>
        </div>
      </form>
    </Modal>
  );
};
