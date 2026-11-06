import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Table2, Folder, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableCard } from '../components/tables/TableCard';
import { TableMetadataEditorModal } from '../components/tables/TableMetadataEditorModal';
import { Button } from '../components/common/Button';
import { tablesService } from '../services/tablesService';
import type { TableItem, FolderItem } from '../types/media';
import type { MetadataCard } from '../types/api';
import styles from './TablesCatalogView.module.css';

/**
 * Propiedades del orquestador de la vista de Catálogo de Datasets.
 */
export interface TablesCatalogViewProps {
  tables: TableItem[];
  activeFolder: FolderItem | null;
  searchQuery: string;
  onSearchChange?: (q: string) => void;
  onOpenStudio: (table: TableItem) => void;
  onOpenUpload: () => void;
  onDeleteTable: (table: TableItem) => void;
  onMoveTableToFolder?: (table: TableItem) => void;
  onTableUpdated?: (updated: TableItem) => void;
  pageLimit?: number;
}

const DEFAULT_PAGE_LIMIT = 24;

/**
 * Orquestador del Catálogo de Datasets con soporte de edición e inspección de Ficha Técnica (`metadataCard`)
 * y paginación server-side (`GET /api/v1/tables?page=&limit=&folderId=`).
 */
export const TablesCatalogView: React.FC<TablesCatalogViewProps> = ({
  tables,
  activeFolder,
  searchQuery,
  onSearchChange,
  onOpenStudio,
  onOpenUpload,
  onDeleteTable,
  onMoveTableToFolder,
  onTableUpdated,
  pageLimit = DEFAULT_PAGE_LIMIT,
}) => {
  const [editingMetadataTable, setEditingMetadataTable] = useState<TableItem | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, TableItem>>({});
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
    tablesService
      .fetchRemoteTables({
        page: currentPage,
        limit: pageLimit,
        folderId: folderIdParam,
      })
      .then(() => {
        if (!isCancelled) {
          const meta = tablesService.getLastPaginationMeta();
          if (meta) {
            setRemoteTotal(meta.total);
          }
        }
      })
      .catch(() => {
        // Manejado internamente por tablesService
      });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, pageLimit, activeFolder?.id]);

  /**
   * Actualiza localmente el dataset tras editar su Ficha Técnica y notifica al espacio de trabajo.
   */
  const handleMetadataSaved = (updated: TableItem) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [updated.id]: updated,
    }));
    onTableUpdated?.(updated);
  };

  const mergedTables = useMemo(
    () => tables.map((t) => localOverrides[t.id] || t),
    [tables, localOverrides]
  );

  const filteredTables = useMemo(() => {
    return mergedTables.filter((t) => {
      if (activeFolder) {
        const isGeneral = activeFolder.name.trim().toLowerCase() === 'general';
        const matchesFolder = t.folderId === activeFolder.id || (isGeneral && !t.folderId);
        if (!matchesFolder) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const meta = (t.metadataCard as MetadataCard | null | undefined) || null;
        const metaTitle = (meta?.title || '').toLowerCase();
        const metaTags = Array.isArray(meta?.tags) ? meta.tags.join(' ').toLowerCase() : '';
        return (
          t.tableName.toLowerCase().includes(q) ||
          t.shortCode.toLowerCase().includes(q) ||
          metaTitle.includes(q) ||
          metaTags.includes(q)
        );
      }

      return true;
    });
  }, [mergedTables, activeFolder, searchQuery]);

  const effectiveTotal = Math.max(filteredTables.length, remoteTotal ?? 0);
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageLimit));
  const showPagination = effectiveTotal > pageLimit;

  const visibleTables = useMemo(() => {
    if (filteredTables.length <= pageLimit) {
      return filteredTables;
    }
    const start = (currentPage - 1) * pageLimit;
    return filteredTables.slice(start, start + pageLimit);
  }, [filteredTables, currentPage, pageLimit]);

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
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {visibleTables.length === 0 ? (
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
          {visibleTables.map((table) => (
            <TableCard
              key={table.id || table.shortCode}
              table={table}
              onOpenStudio={onOpenStudio}
              onDelete={onDeleteTable}
              onMoveToFolder={onMoveTableToFolder}
              onEditMetadata={setEditingMetadataTable}
            />
          ))}
        </div>
      )}

      <TableMetadataEditorModal
        table={editingMetadataTable}
        isOpen={!!editingMetadataTable}
        onClose={() => setEditingMetadataTable(null)}
        onMetadataSaved={handleMetadataSaved}
      />
    </div>
  );
};
