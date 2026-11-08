import React from 'react';
import { Upload, Folder, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../common/Button';
import type { FolderItem } from '../../types/media';
import styles from '../../views/TablesCatalogView.module.css';

/**
 * Propiedades de la barra de herramientas del catálogo de datasets.
 */
export interface TablesToolbarProps {
  activeFolder: FolderItem | null;
  totalTablesCount: number;
  searchQuery: string;
  onSearchChange?: (q: string) => void;
  showPagination: boolean;
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenUpload: () => void;
}

/**
 * Barra superior del catálogo de tablas: título, selector de carpeta, búsqueda,
 * paginación y botón para subir datasets.
 */
export const TablesToolbar: React.FC<TablesToolbarProps> = ({
  activeFolder,
  totalTablesCount,
  searchQuery,
  onSearchChange,
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
        <h1 className={styles.title}>Catálogo de Datasets</h1>
        {activeFolder ? (
          <div className={styles.folderTag}>
            <Folder size={12} />
            <span>Carpeta: {activeFolder.name}</span>
          </div>
        ) : (
          <span className={styles.subtitle}>
            Hojas de cálculo CSV y Excel con visualizador interactivo ({totalTablesCount})
          </span>
        )}
      </div>

      <div className={styles.controlsRow}>
        {onSearchChange && (
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar dataset o código..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={styles.searchInput}
              aria-label="Buscar datasets"
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

        {showPagination && (
          <div
            data-testid="tables-pagination"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: 9999,
              padding: '3px 8px',
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              icon={<ChevronLeft size={14} />}
              onClick={onPrevPage}
              disabled={currentPage <= 1}
              aria-label="Página anterior"
            >
              Anterior
            </Button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 4px' }}>
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<ChevronRight size={14} />}
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              aria-label="Página siguiente"
            >
              Siguiente
            </Button>
          </div>
        )}

        <Button variant="primary" size="sm" icon={<Upload size={14} />} onClick={onOpenUpload}>
          Subir Dataset
        </Button>
      </div>
    </div>
  );
};

