import React, { useState, useMemo, useEffect } from 'react';
import { Upload, ImageIcon, Folder, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageCard } from '../components/images/ImageCard';
import { ImageInspector } from '../components/images/ImageInspector';
import { RenameImageModal } from '../components/images/RenameImageModal';
import { HotSwapImageModal } from '../components/images/HotSwapImageModal';
import { Button } from '../components/common/Button';
import { imagesService } from '../services/imagesService';
import type { ImageItem, FolderItem } from '../types/media';
import styles from './ImagesView.module.css';

/**
 * Propiedades del orquestador de la vista de Galería de Imágenes.
 */
export interface ImagesViewProps {
  images: ImageItem[];
  activeFolder: FolderItem | null;
  searchQuery: string;
  onSearchChange?: (q: string) => void;
  onOpenUpload: () => void;
  onDeleteImage: (image: ImageItem) => void;
  onMoveImageToFolder?: (image: ImageItem) => void;
  onImageUpdated?: (updated: ImageItem) => void;
  pageLimit?: number;
}

/**
 * Filtro de formato de archivo de imagen en la barra de herramientas.
 */
export type FormatFilter = 'ALL' | 'PNG' | 'JPG' | 'WEBP' | 'SVG';

const DEFAULT_PAGE_LIMIT = 24;

/**
 * Orquestador de la Galería de Imágenes con soporte para miniaturas WebP,
 * renombrado en caliente (`PATCH`), reemplazo binario Hot-Swap (`PUT`) y paginación server-side.
 */
export const ImagesView: React.FC<ImagesViewProps> = ({
  images,
  activeFolder,
  searchQuery,
  onSearchChange,
  onOpenUpload,
  onDeleteImage,
  onMoveImageToFolder,
  onImageUpdated,
  pageLimit = DEFAULT_PAGE_LIMIT,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<FormatFilter>('ALL');
  const [inspectingImage, setInspectingImage] = useState<ImageItem | null>(null);
  const [renamingImage, setRenamingImage] = useState<ImageItem | null>(null);
  const [hotSwappingImage, setHotSwappingImage] = useState<ImageItem | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, ImageItem>>({});

  const [trackedFolderId, setTrackedFolderId] = useState<string | null>(activeFolder?.id ?? null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [remoteTotal, setRemoteTotal] = useState<number | null>(null);

  if ((activeFolder?.id ?? null) !== trackedFolderId) {
    setTrackedFolderId(activeFolder?.id ?? null);
    setCurrentPage(1);
  }

  useEffect(() => {
    const folderIdParam = activeFolder?.id || null;
    if (currentPage === 1 && !folderIdParam && pageLimit === DEFAULT_PAGE_LIMIT) {
      return;
    }

    let isCancelled = false;
    imagesService
      .fetchRemoteImages({
        page: currentPage,
        limit: pageLimit,
        folderId: folderIdParam,
      })
      .then(() => {
        if (!isCancelled) {
          const meta = imagesService.getLastPaginationMeta();
          if (meta) {
            setRemoteTotal(meta.total);
          }
        }
      })
      .catch(() => {
        // Manejado internamente por imagesService
      });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, pageLimit, activeFolder?.id]);

  /**
   * Aplica actualizaciones en caliente (renombrado o Hot-Swap) sobre el estado local y el inspector.
   */
  const handleLocalImageUpdate = (updated: ImageItem) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [updated.id]: updated,
    }));
    setInspectingImage((prev) => (prev && prev.id === updated.id ? updated : prev));
    onImageUpdated?.(updated);
  };

  const mergedImages = useMemo(
    () => images.map((img) => localOverrides[img.id] || img),
    [images, localOverrides]
  );

  const filteredImages = useMemo(() => {
    return mergedImages.filter((img) => {
      if (activeFolder) {
        const isGeneral = activeFolder.name.trim().toLowerCase() === 'general';
        const matchesFolder = img.folderId === activeFolder.id || (isGeneral && !img.folderId);
        if (!matchesFolder) {
          return false;
        }
      }

      if (selectedFormat === 'PNG' && !img.mimeType.includes('png') && !/\.png$/i.test(img.originalName)) return false;
      if (selectedFormat === 'JPG' && !img.mimeType.includes('jpeg') && !/\.(jpe?g)$/i.test(img.originalName)) return false;
      if (selectedFormat === 'WEBP' && !img.mimeType.includes('webp') && !/\.webp$/i.test(img.originalName)) return false;
      if (selectedFormat === 'SVG' && !img.mimeType.includes('svg') && !/\.svg$/i.test(img.originalName)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return img.originalName.toLowerCase().includes(q) || img.shortCode.toLowerCase().includes(q);
      }
      return true;
    });
  }, [mergedImages, activeFolder, selectedFormat, searchQuery]);

  const effectiveTotal = Math.max(filteredImages.length, remoteTotal ?? 0);
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageLimit));
  const showPagination = effectiveTotal > pageLimit;

  const visibleImages = useMemo(() => {
    if (filteredImages.length <= pageLimit) return filteredImages;
    const start = (currentPage - 1) * pageLimit;
    return filteredImages.slice(start, start + pageLimit);
  }, [filteredImages, currentPage, pageLimit]);

  return (
    <div className={styles.container} data-testid="images-view">
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Galería de Imágenes</h1>
          {activeFolder ? (
            <div className={styles.folderTag}>
              <Folder size={12} />
              <span>Carpeta: {activeFolder.name}</span>
            </div>
          ) : (
            <span className={styles.subtitle}>
              Todas las imágenes registradas en el backend ({filteredImages.length})
            </span>
          )}
        </div>

        <div className={styles.controlsRow}>
          {onSearchChange && (
            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar imagen o código..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className={styles.clearSearchBtn}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className={styles.filterTabs} role="tablist" aria-label="Filtro de formato">
            {(['ALL', 'PNG', 'JPG', 'WEBP', 'SVG'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                role="tab"
                aria-selected={selectedFormat === fmt}
                className={`${styles.filterTab} ${selectedFormat === fmt ? styles.active : ''}`}
                onClick={() => setSelectedFormat(fmt)}
              >
                {fmt === 'ALL' ? 'Todos' : fmt}
              </button>
            ))}
          </div>

          {showPagination && (
            <div className={styles.paginationControls} data-testid="gallery-pagination">
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                aria-label="Página anterior"
              >
                <ChevronLeft size={14} />
                <span>Anterior</span>
              </button>
              <span className={styles.pageIndicator}>
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                aria-label="Página siguiente"
              >
                <span>Siguiente</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <button
            type="button"
            className={styles.uploadHeaderBtn}
            onClick={onOpenUpload}
            title="Subir imágenes"
          >
            <Upload size={14} />
            <span>Subir</span>
          </button>
        </div>
      </div>

      {visibleImages.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <ImageIcon size={28} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {searchQuery ? 'No se encontraron imágenes' : 'No hay imágenes registradas'}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: 380 }}>
            {searchQuery
              ? `No hay resultados para '${searchQuery}'. Prueba con otro término.`
              : 'Arrastra imágenes aquí o pulsa el botón para subir tus primeros archivos.'}
          </p>
          <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={onOpenUpload}>
            Subir Imágenes
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {visibleImages.map((image) => (
            <ImageCard
              key={image.id || image.shortCode}
              image={image}
              onOpenInspector={setInspectingImage}
              onDelete={onDeleteImage}
              onMoveToFolder={onMoveImageToFolder}
              onRename={setRenamingImage}
              onHotSwap={setHotSwappingImage}
            />
          ))}
        </div>
      )}

      <ImageInspector
        image={inspectingImage}
        isOpen={!!inspectingImage}
        onClose={() => setInspectingImage(null)}
        onDelete={onDeleteImage}
        onRename={setRenamingImage}
        onHotSwap={setHotSwappingImage}
      />

      <RenameImageModal
        image={renamingImage}
        isOpen={!!renamingImage}
        onClose={() => setRenamingImage(null)}
        onImageRenamed={handleLocalImageUpdate}
      />

      <HotSwapImageModal
        image={hotSwappingImage}
        isOpen={!!hotSwappingImage}
        onClose={() => setHotSwappingImage(null)}
        onImageReplaced={handleLocalImageUpdate}
      />
    </div>
  );
};
