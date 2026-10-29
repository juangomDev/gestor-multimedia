import React, { useMemo } from 'react';
import { Upload, Table2, Folder, Search, X } from 'lucide-react';
import { TableCard } from '../components/tables/TableCard';
import { Button } from '../components/common/Button';
import type { TableItem, FolderItem } from '../types/media';
import styles from './TablesCatalogView.module.css';

interface TablesCatalogViewProps {
  tables: TableItem[];
  activeFolder: FolderItem | null;
  searchQuery: string;
  onSearchChange?: (q: string) => void;
  onOpenStudio: (table: TableItem) => void;
  onOpenUpload: () => void;
  onDeleteTable: (table: TableItem) => void;
  onMoveTableToFolder?: (table: TableItem) => void;
}

export const TablesCatalogView: React.FC<TablesCatalogViewProps> = ({
  tables,
  activeFolder,
  searchQuery,
  onSearchChange,
  onOpenStudio,
  onOpenUpload,
  onDeleteTable,
  onMoveTableToFolder,
}) => {
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // Folder filter
      if (activeFolder && t.folderId !== activeFolder.id) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.tableName.toLowerCase().includes(q) ||
          t.shortCode.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [tables, activeFolder, searchQuery]);

  return (
    <div className={styles.container} data-testid="tables-catalog-view">
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
              Hojas de cálculo CSV y Excel con visualizador interactivo ({filteredTables.length})
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

          <Button variant="primary" size="sm" icon={<Upload size={14} />} onClick={onOpenUpload}>
            Subir Dataset
          </Button>
        </div>
      </div>

      {filteredTables.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Table2 size={28} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {searchQuery ? 'No se encontraron datasets' : 'No hay datasets registrados'}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: 380 }}>
            {searchQuery
              ? `No hay coincidencias para '${searchQuery}'. Intenta con otro nombre.`
              : 'Arrastra archivos .csv o .xlsx para analizarlos en el Data Studio.'}
          </p>
          <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={onOpenUpload}>
            Seleccionar Archivo CSV / Excel
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredTables.map((table) => (
            <TableCard
              key={table.id || table.shortCode}
              table={table}
              onOpenStudio={onOpenStudio}
              onDelete={onDeleteTable}
              onMoveToFolder={onMoveTableToFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};
