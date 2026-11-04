import React from 'react';
import { Copy, Trash2, Eye, FolderInput, ExternalLink } from 'lucide-react';
import { buildPublicAssetUrl } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/useToast';
import { storageService } from '../../services/storageService';
import type { ImageItem } from '../../types/media';
import styles from './ImageCard.module.css';

interface ImageCardProps {
  image: ImageItem;
  onOpenInspector: (image: ImageItem) => void;
  onDelete: (image: ImageItem) => void;
  onMoveToFolder?: (image: ImageItem) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  onOpenInspector,
  onDelete,
  onMoveToFolder,
}) => {
  const { showToast } = useToast();
  const [imgError, setImgError] = React.useState(false);

  const handleCopyShortCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(image.shortCode);
    if (success) {
      showToast(`Código '${image.shortCode}' copiado al portapapeles`, 'success');
    }
  };

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(image.url);
    if (success) {
      showToast(`URL corta copiada (${image.shortCode})`, 'success');
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(image);
  };

  const canonicalUrl = buildPublicAssetUrl(storageService.getConfig().baseUrl, 'i', image.shortCode);
  const displayUrl = imgError ? canonicalUrl : (image.demoPreviewUrl || image.url || canonicalUrl);

  return (
    <div
      className={styles.card}
      onClick={() => onOpenInspector(image)}
      data-testid={`image-card-${image.shortCode}`}
    >
      <div className={styles.thumbnailWrapper}>
        <button
          type="button"
          onClick={handleCopyShortCode}
          className={styles.shortCodeBadge}
          title="Copiar código al portapapeles (1 clic)"
          aria-label={`Copiar código ${image.shortCode}`}
        >
          <Copy size={11} className={styles.badgeCopyIcon} />
          <span>{image.shortCode}</span>
        </button>

        <img
          src={displayUrl}
          alt={image.originalName}
          className={styles.thumbnail}
          loading="lazy"
          onError={(e) => {
            if (!imgError && displayUrl !== canonicalUrl) {
              setImgError(true);
            } else {
              (e.currentTarget as HTMLElement).style.opacity = '0.5';
            }
          }}
        />

        <div className={styles.overlayActions}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInspector(image);
            }}
            className={styles.actionBtn}
            title="Previsualizar con zoom"
            aria-label="Previsualizar"
          >
            <Eye size={16} />
          </button>
          <a
            href={canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionBtn}
            title="Abrir en el navegador"
            aria-label="Abrir en el navegador"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={15} />
          </a>
          <button
            type="button"
            onClick={handleCopyUrl}
            className={styles.actionBtn}
            title="Copiar URL directa /i/..."
            aria-label="Copiar URL"
          >
            <Copy size={16} />
          </button>
          {onMoveToFolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToFolder(image);
              }}
              className={styles.actionBtn}
              title="Mover a otra carpeta"
              aria-label="Mover a carpeta"
            >
              <FolderInput size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
            title="Eliminar imagen"
            aria-label="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className={styles.info}>
        <span className={styles.fileName} title={image.originalName}>
          {image.originalName}
        </span>
      </div>
    </div>
  );
};
