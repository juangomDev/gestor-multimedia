import React from 'react';
import { Upload, Folder, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FolderItem } from '../../types/media';
import styles from '../../views/ImagesView.module.css';

/**
 * Formato de imagen admitido en los tabs de filtrado.
 */
export type FormatFilter = 'ALL' | 'PNG' | 'JPG' | 'WEBP' | 'SVG';

/**
 * Propiedades de la barra de herramientas y controles de la galería de imágenes.
 */
export interface ImagesToolbarProps {
  activeFolder: FolderItem | null;
  totalImagesCount: number;
  searchQuery: string;
  onSearchChange?: (q: string) => void;
  selectedFormat: FormatFilter;
  onSelectFormat: (fmt: FormatFilter) => void;
  showPagination: boolean;
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenUpload: () => void;
}

/**
 * Barra superior de la galería de imágenes: título, selector de carpeta, búsqueda, filtros de formato,
 * paginación y botón de subida.
 */
export const ImagesToolbar: React.FC<ImagesToolbarProps> = ({
  activeFolder,
  totalImagesCount,
  searchQuery,
  onSearchChange,
  selectedFormat,
  onSelectFormat,
  showPagination,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onOpenUpload,
}) => {
  return (
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
            Todas las imágenes registradas en el backend ({totalImagesCount})
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
              aria-label="Buscar imágenes"
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
              onClick={() => onSelectFormat(fmt)}
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
              onClick={onPrevPage}
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
              onClick={onNextPage}
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
  );
};

