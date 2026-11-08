import React, { useState, useMemo, useEffect } from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import { ImageCard } from '../components/images/ImageCard';
import { ImageInspector } from '../components/images/ImageInspector';
import { RenameImageModal } from '../components/images/RenameImageModal';
import { HotSwapImageModal } from '../components/images/HotSwapImageModal';
import { ImagesToolbar, type FormatFilter } from '../components/images/ImagesToolbar';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { BulkDeleteModal } from '../components/common/BulkDeleteModal';
import { BulkMoveModal } from '../components/common/BulkMoveModal';
import { Button } from '../components/common/Button';
import { imagesService } from '../services/imagesService';
import { bulkService } from '../services/bulkService';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { useToast } from '../context/useToast';
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
  folders?: FolderItem[];
  onBulkActionFinished?: () => void;
}

const DEFAULT_PAGE_LIMIT = 24;

/**
 * Orquestador de la Galería de Imágenes con soporte para búsqueda unificada con debounce,
 * selección múltiple y operaciones en lote (`Bulk Actions`), miniaturas WebP y Hot-Swap.
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
  folders = [],
  onBulkActionFinished,
}) => {
  const { showToast } = useToast();
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

  // Consulta remota con soporte para paginación, carpeta activa y búsqueda server-side
  useEffect(() => {
    const folderIdParam = activeFolder?.id || null;
    const cleanSearch = searchQuery.trim();
    if (currentPage === 1 && !folderIdParam && !cleanSearch && pageLimit === DEFAULT_PAGE_LIMIT) {
      return;
    }

    let isCancelled = false;
    const fetchOptions: { page: number; limit: number; folderId: string | null; search?: string } = {
      page: currentPage,
      limit: pageLimit,
      folderId: folderIdParam,
    };
    if (cleanSearch) {
      fetchOptions.search = cleanSearch;
    }

    imagesService
      .fetchRemoteImages(fetchOptions)
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
  }, [currentPage, pageLimit, activeFolder?.id, searchQuery]);

  const handleLocalImageUpdate = (updated: ImageItem) => {
    setLocalOverrides((prev) => ({ ...prev, [updated.id]: updated }));
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
        if (!matchesFolder) return false;
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

  // Hook de selección múltiple para acciones en lote
  const bulk = useBulkSelection(visibleImages);

  const handleConfirmBulkDelete = async () => {
    try {
      const res = await bulkService.bulkDeleteImages(bulk.selectedIds);
      showToast(`${res.successful.length} imágenes eliminadas en lote exitosamente`, 'success');
      bulk.clearSelection();
      onBulkActionFinished?.();
    } catch (err: any) {
      showToast(err?.detail || err?.message || 'Error en la eliminación en lote', 'error');
    }
  };

  const handleConfirmBulkMove = async (targetFolderId: string) => {
    try {
      const res = await bulkService.bulkMoveImages(bulk.selectedIds, targetFolderId);
      showToast(`${res.successful.length} imágenes movidas exitosamente a la carpeta`, 'success');
      bulk.clearSelection();
      onBulkActionFinished?.();
    } catch (err: any) {
      showToast(err?.detail || err?.message || 'Error al mover imágenes en lote', 'error');
    }
  };

  return (
    <div className={styles.container} data-testid="images-view">
      <ImagesToolbar
        activeFolder={activeFolder}
        totalImagesCount={filteredImages.length}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        selectedFormat={selectedFormat}
        onSelectFormat={setSelectedFormat}
        showPagination={showPagination}
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        onOpenUpload={onOpenUpload}
      />

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
              isSelected={bulk.isSelected(image.id)}
              onToggleSelect={() => bulk.toggleSelect(image.id)}
              onOpenInspector={setInspectingImage}
              onDelete={onDeleteImage}
              onMoveToFolder={onMoveImageToFolder}
              onRename={setRenamingImage}
              onHotSwap={setHotSwappingImage}
            />
          ))}
        </div>
      )}

      <BulkActionBar
        selectedCount={bulk.selectedCount}
        totalCount={visibleImages.length}
        onClearSelection={bulk.clearSelection}
        onSelectAll={bulk.selectAll}
        onOpenBulkMove={bulk.openBulkMove}
        onOpenBulkDelete={bulk.openBulkDelete}
        itemLabel="imágenes"
      />

      <BulkDeleteModal
        isOpen={bulk.isBulkDeleteOpen}
        onClose={bulk.closeBulkDelete}
        selectedCount={bulk.selectedCount}
        itemLabel="imágenes"
        onConfirm={handleConfirmBulkDelete}
      />

      <BulkMoveModal
        isOpen={bulk.isBulkMoveOpen}
        onClose={bulk.closeBulkMove}
        selectedCount={bulk.selectedCount}
        category="image"
        folders={folders}
        onConfirm={handleConfirmBulkMove}
      />

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
