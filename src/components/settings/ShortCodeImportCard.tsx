import React, { useState } from 'react';
import { Download, Image as ImageIcon, Table2 } from 'lucide-react';
import { Button } from '../common/Button';
import { storageService } from '../../services/storageService';
import { cleanBaseUrl, buildPublicAssetUrl } from '../../utils/formatters';
import { useToast } from '../../context/useToast';
import type { MediaCategory, ImageItem, TableItem } from '../../types/media';
import styles from './SettingsCards.module.css';

/**
 * Propiedades para la tarjeta de importación directa de activos por `shortCode`.
 */
export interface ShortCodeImportCardProps {
  baseUrl: string;
  folderId?: string | null;
  onItemImported?: () => void;
}

/**
 * Tarjeta interactiva para vincular e importar una imagen o tabla existente mediante su `shortCode`.
 */
export const ShortCodeImportCard: React.FC<ShortCodeImportCardProps> = ({
  baseUrl,
  folderId,
  onItemImported,
}) => {
  const { showToast } = useToast();
  const [importCode, setImportCode] = useState('');
  const [importName, setImportName] = useState('');
  const [importCategory, setImportCategory] = useState<MediaCategory>('image');

  /**
   * Registra en el catálogo local un activo remoto identificado por su `shortCode`.
   */
  const handleImportShortCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = importCode.trim();
    if (!code) {
      showToast('Por favor introduce un shortCode válido', 'error');
      return;
    }

    const currentBase = cleanBaseUrl(baseUrl || storageService.getConfig().baseUrl);

    if (importCategory === 'image') {
      const newItem: ImageItem = {
        id: `import-${Date.now()}`,
        shortCode: code,
        originalName: importName.trim() || `imagen-${code}.png`,
        mimeType: 'image/png',
        sizeBytes: 0,
        url: buildPublicAssetUrl(currentBase, 'i', code),
        createdAt: new Date().toISOString(),
        folderId: folderId || null,
      };
      storageService.addImage(newItem);
      showToast(`Imagen '${newItem.originalName}' importada al catálogo`, 'success');
    } else {
      const newItem: TableItem = {
        id: `import-${Date.now()}`,
        shortCode: code,
        tableName: importName.trim() || `tabla-${code}.csv`,
        rowCount: 0,
        sizeBytes: 0,
        url: buildPublicAssetUrl(currentBase, 't', code),
        createdAt: new Date().toISOString(),
        folderId: folderId || null,
      };
      storageService.addTable(newItem);
      showToast(`Dataset '${newItem.tableName}' importado al catálogo`, 'success');
    }

    setImportCode('');
    setImportName('');
    onItemImported?.();
  };

  const cleanCurrentBase = cleanBaseUrl(
    baseUrl || storageService.getConfig().baseUrl || 'http://localhost:3000'
  );
  const previewPath = importCategory === 'image' ? 'i' : 't';
  const previewShortCode = importCode.trim() || ':shortCode';
  const previewCanonicalUrl = `${cleanCurrentBase}/${previewPath}/${previewShortCode}`;

  return (
    <section className={styles.card} aria-labelledby="import-shortcode-heading">
      <div className={styles.cardHeader}>
        <div className={`${styles.cardIcon} ${styles.cardIconPurple}`}>
          <Download size={20} />
        </div>
        <div className={styles.cardHeaderTexts}>
          <h2 id="import-shortcode-heading" className={styles.cardTitle}>
            Importación por ShortCode
          </h2>
          <span className={styles.cardSubtitle}>
            Registra un recurso existente en el catálogo sin volver a subirlo.
          </span>
        </div>
      </div>

      <form onSubmit={handleImportShortCode} className={styles.form}>
        <div className={styles.field}>
          <span className={styles.label}>Tipo de Recurso</span>
          <div className={styles.typeSelector}>
            <button
              type="button"
              className={`${styles.typeBtn} ${importCategory === 'image' ? styles.active : ''}`}
              onClick={() => setImportCategory('image')}
            >
              <ImageIcon size={16} />
              <span>Imagen (/i/...)</span>
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${importCategory === 'table' ? styles.active : ''}`}
              onClick={() => setImportCategory('table')}
            >
              <Table2 size={16} />
              <span>Tabla / CSV (/t/...)</span>
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
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
          />
          <span className={styles.help}>
            Identificador único de 10 caracteres generado al subir el archivo al backend.
          </span>
        </div>

        <div className={styles.field}>
          <label htmlFor="import-name" className={styles.label}>
            Nombre personalizado (opcional)
          </label>
          <input
            id="import-name"
            type="text"
            className={`${styles.input} ${styles.inputSans}`}
            placeholder={
              importCategory === 'image' ? 'ej. diagrama-cluster.png' : 'ej. reporte-metricas.csv'
            }
            value={importName}
            onChange={(e) => setImportName(e.target.value)}
          />
        </div>

        <div className={styles.previewBox}>
          <span className={styles.previewLabel}>Enlace Canónico Público</span>
          <span className={styles.previewUrl}>{previewCanonicalUrl}</span>
        </div>

        <div className={styles.actions}>
          <Button type="submit" variant="primary" icon={<Download size={16} />}>
            Importar al Catálogo
          </Button>
        </div>
      </form>
    </section>
  );
};

