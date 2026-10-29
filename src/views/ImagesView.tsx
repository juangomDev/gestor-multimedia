import React, { useState, useMemo } from 'react';
import { Upload, ImageIcon, Folder, Search, X } from 'lucide-react';
import { ImageCard } from '../components/images/ImageCard';
import { ImageInspector } from '../components/images/ImageInspector';
import { Button } from '../components/common/Button';
import type { ImageItem, FolderItem } from '../types/media';
import styles from './ImagesView.module.css';

interface ImagesViewProps {
  images: ImageItem[];
  activeFolder: FolderItem | null;
  searchQuery: string;
  onSearchChange?: (q: string) => void;
  onOpenUpload: () => void;
  onDeleteImage: (image: ImageItem) => void;
  onMoveImageToFolder?: (image: ImageItem) => void;
}

export const ImagesView: React.FC<ImagesViewProps> = ({
  images,
  activeFolder,
  searchQuery,
  onSearchChange,
  onOpenUpload,
  onDeleteImage,
  onMoveImageToFolder,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'ALL' | 'PNG' | 'JPG' | 'WEBP'>('ALL');
  const [inspectingImage, setInspectingImage] = useState<ImageItem | null>(null);

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      // Folder filter
      if (activeFolder && img.folderId !== activeFolder.id) {
        return false;
      }

      // Format filter
      if (selectedFormat === 'PNG' && !img.mimeType.includes('png') && !img.originalName.endsWith('.png')) {
        return false;
      }
      if (
        selectedFormat === 'JPG' &&
        !img.mimeType.includes('jpeg') &&
        !/\.(jpe?g)$/i.test(img.originalName)
      ) {
        return false;
      }
      if (selectedFormat === 'WEBP' && !img.mimeType.includes('webp') && !img.originalName.endsWith('.webp')) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          img.originalName.toLowerCase().includes(q) ||
          img.shortCode.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [images, activeFolder, selectedFormat, searchQuery]);

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
          {/* Integrated Search Box */}
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
                  onClick={() => onSearchChange('')}
                  className={styles.clearSearchBtn}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Format Tabs */}
          <div className={styles.filterTabs}>
            {(['ALL', 'PNG', 'JPG', 'WEBP'] as const).map((fmt) => (
              <button
                key={fmt}
                className={`${styles.filterTab} ${selectedFormat === fmt ? styles.active : ''}`}
                onClick={() => setSelectedFormat(fmt)}
              >
                {fmt === 'ALL' ? 'Todos' : fmt}
              </button>
            ))}
          </div>

          <Button variant="primary" size="sm" icon={<Upload size={14} />} onClick={onOpenUpload}>
            Subir
          </Button>
        </div>
      </div>

      {filteredImages.length === 0 ? (
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
          {filteredImages.map((image) => (
            <ImageCard
              key={image.id || image.shortCode}
              image={image}
              onOpenInspector={setInspectingImage}
              onDelete={onDeleteImage}
              onMoveToFolder={onMoveImageToFolder}
            />
          ))}
        </div>
      )}

      <ImageInspector
        image={inspectingImage}
        isOpen={!!inspectingImage}
        onClose={() => setInspectingImage(null)}
        onDelete={onDeleteImage}
      />
    </div>
  );
};
