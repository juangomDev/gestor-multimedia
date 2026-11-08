import React from 'react';
import { Copy, Trash2, Eye, FolderInput, ExternalLink, Pencil, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { buildPublicAssetUrl } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/useToast';
import { storageService } from '../../services/storageService';
import { imagesService } from '../../services/imagesService';
import type { ImageItem } from '../../types/media';
import styles from './ImageCard.module.css';

/**
 * Propiedades de la tarjeta de imagen en la cuadrícula de la galería.
 */
export interface ImageCardProps {
  image: ImageItem;
  onOpenInspector: (image: ImageItem) => void;
  onDelete: (image: ImageItem) => void;
  onMoveToFolder?: (image: ImageItem) => void;
  onRename?: (image: ImageItem) => void;
  onHotSwap?: (image: ImageItem) => void;
  isSelected?: boolean;
  onToggleSelect?: (image: ImageItem) => void;
}

/**
 * Tarjeta visual de imagen optimizada con miniaturas WebP (`/i/:short_code?variant=thumb`)
 * y soporte de invalidación de caché mediante `urlWithVersion`.
 */
export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  onOpenInspector,
  onDelete,
  onMoveToFolder,
  onRename,
  onHotSwap,
  isSelected = false,
  onToggleSelect,
}) => {
  const { showToast } = useToast();
  const [imgError, setImgError] = React.useState(false);

  /**
   * Copia el `shortCode` de la imagen al portapapeles con 1 clic.
   */
  const handleCopyShortCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(image.shortCode);
    if (success) {
      showToast(`Código '${image.shortCode}' copiado al portapapeles`, 'success');
    }
  };

  /**
   * Copia la URL corta pública al portapapeles.
   */
  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(image.url);
    if (success) {
      showToast(`URL corta copiada (${image.shortCode})`, 'success');
    }
  };

  /**
   * Dispara la eliminación de la imagen sin abrir el inspector.
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(image);
  };

  const canonicalUrl = buildPublicAssetUrl(storageService.getConfig().baseUrl, 'i', image.shortCode);
  const thumbVariantUrl = imagesService.getImageVariantUrl(image, 'thumb');
  const displayUrl = imgError
    ? canonicalUrl
    : image.demoPreviewUrl || thumbVariantUrl;

  return (
    <div
      className={styles.card}
      onClick={() => onOpenInspector(image)}
      data-testid={`image-card-${image.shortCode}`}
      style={isSelected ? { borderColor: 'var(--accent-primary)', boxShadow: '0 0 0 1px var(--accent-primary)' } : undefined}
    >
      <div className={styles.thumbnailWrapper}>
        {onToggleSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(image);
            }}
            aria-label={isSelected ? `Deseleccionar ${image.originalName}` : `Seleccionar ${image.originalName}`}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 3,
              background: 'rgba(0, 0, 0, 0.6)',
              border: 'none',
              borderRadius: 4,
              padding: 4,
              cursor: 'pointer',
              color: isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
        )}
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
          {onRename && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRename(image);
              }}
              className={styles.actionBtn}
              title="Renombrar imagen"
              aria-label="Renombrar"
            >
              <Pencil size={15} />
            </button>
          )}
          {onHotSwap && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onHotSwap(image);
              }}
              className={styles.actionBtn}
              title="Reemplazar binario en caliente (Hot-Swap)"
              aria-label="Reemplazar binario"
            >
              <RefreshCw size={15} />
            </button>
          )}
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
