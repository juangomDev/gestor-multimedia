import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../common/Button';
import styles from '../../views/TableDataStudioView.module.css';

/**
 * Propiedades de la barra de herramientas analíticas del Data Studio.
 */
export interface DataStudioToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  limit: number;
  onLimitChange: (newLimit: number) => void;
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (newPage: number) => void;
}

/**
 * Barra de herramientas con buscador en vivo, selector de densidad de filas y paginación server-side.
 */
export const DataStudioToolbar: React.FC<DataStudioToolbarProps> = ({
  searchQuery,
  onSearchChange,
  limit,
  onLimitChange,
  page,
  totalPages,
  loading,
  onPageChange,
}) => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className={styles.searchInput}
            style={{ paddingLeft: 32 }}
            placeholder="Filtrar filas por cualquier valor..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.toolbarRight}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Filas por pág:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className={styles.select}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>

        <div className={styles.pagination}>
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </Button>

          <span className={styles.pageIndicator}>
            Página {page} de {Math.max(1, totalPages)}
          </span>

          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            aria-label="Página siguiente"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

