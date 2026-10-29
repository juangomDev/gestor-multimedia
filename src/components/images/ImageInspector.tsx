import React, { useState } from 'react';
import { Copy, Download, Trash2, ZoomIn, ZoomOut, Grid, ExternalLink } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatBytes, formatDate, buildPublicAssetUrl } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/ToastContext';
import { storageService } from '../../services/storageService';
import type { ImageItem } from '../../types/media';
import styles from './ImageInspector.module.css';

interface ImageInspectorProps {
  image: ImageItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (image: ImageItem) => void;
}

export const ImageInspector: React.FC<ImageInspectorProps> = ({
  image,
  isOpen,
  onClose,
  onDelete,
}) => {
  const { showToast } = useToast();
  const [zoom, setZoom] = useState(1);
  const [useCheckerboard, setUseCheckerboard] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);

  if (!image) return null;

  const canonicalUrl = buildPublicAssetUrl(storageService.getConfig().baseUrl, 'i', image.shortCode);
  const displayUrl = imgLoadError ? canonicalUrl : (image.demoPreviewUrl || image.url || canonicalUrl);
  const curlCmd = `curl "${canonicalUrl}" --output "${image.originalName}"`;

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(canonicalUrl);
    if (success) {
      showToast('URL corta copiada al portapapeles', 'success');
    }
  };

  const handleCopyCurl = async () => {
    const success = await copyToClipboard(curlCmd);
    if (success) {
      showToast('Comando cURL copiado al portapapeles', 'success');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={image.originalName} wide>
      <div className={styles.container}>
        <div className={`${styles.previewBox} ${useCheckerboard ? styles.checkerboard : ''}`}>
          <img
            src={displayUrl}
            alt={image.originalName}
            className={styles.image}
            style={{ transform: `scale(${zoom})` }}
            onError={() => {
              if (!imgLoadError && displayUrl !== canonicalUrl) {
                setImgLoadError(true);
              }
            }}
          />

          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              display: 'flex',
              gap: 6,
              background: 'rgba(0, 0, 0, 0.65)',
              padding: 4,
              borderRadius: 8,
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              style={{ color: '#fff', padding: 4 }}
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              style={{ color: '#fff', padding: 4 }}
              title="Reducir zoom"
              aria-label="Reducir zoom"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => setUseCheckerboard((c) => !c)}
              style={{ color: useCheckerboard ? '#93c5fd' : '#fff', padding: 4 }}
              title="Fondo ajedrezado para transparencias"
              aria-label="Fondo ajedrezado"
            >
              <Grid size={16} />
            </button>
          </div>
        </div>

        <div className={styles.detailsBox}>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
              Detalles del Recurso
            </h4>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>ShortCode:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={styles.detailValue}>{image.shortCode}</span>
                <a
                  href={canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.inlineLink}
                  title="Abrir enlace directo en el navegador"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Tipo MIME:</span>
              <span className={styles.detailValue}>{image.mimeType}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Tamaño:</span>
              <span className={styles.detailValue}>{formatBytes(image.sizeBytes)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fecha de Subida:</span>
              <span className={styles.detailValue}>{formatDate(image.createdAt)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Enlace directo:</span>
              <a
                href={canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.directLink}
                title="Abrir URL en nueva pestaña"
              >
                <span>/i/{image.shortCode}</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Comando cURL:
            </span>
            <div className={styles.codeSnippet} onClick={handleCopyCurl} title="Clic para copiar comando">
              {curlCmd}
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="primary" icon={<Copy size={16} />} onClick={handleCopyUrl}>
              Copiar URL Corta
            </Button>
            <a
              href={displayUrl}
              download={image.originalName}
              target="_blank"
              rel="noreferrer"
              style={{ width: '100%', textDecoration: 'none' }}
            >
              <Button variant="secondary" icon={<Download size={16} />} style={{ width: '100%' }}>
                Descargar Imagen
              </Button>
            </a>
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={() => {
                onDelete(image);
                onClose();
              }}
            >
              Eliminar Recurso
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
