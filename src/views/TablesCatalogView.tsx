import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Table2 } from 'lucide-react';
import { TableCard } from '../components/tables/TableCard';
import { TableMetadataEditorModal } from '../components/tables/TableMetadataEditorModal';
import { RenameTableModal } from '../components/tables/RenameTableModal';
import { HotSwapTableModal } from '../components/tables/HotSwapTableModal';
import { TablesToolbar } from '../components/tables/TablesToolbar';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { BulkDeleteModal } from '../components/common/BulkDeleteModal';
import { BulkMoveModal } from '../components/common/BulkMoveModal';
import { Button } from '../components/common/Button';
import { tablesService } from '../services/tablesService';
import { bulkService } from '../services/bulkService';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { useToast } from '../context/useToast';
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
  folders?: FolderItem[];
  onBulkActionFinished?: () => void;
}

const DEFAULT_PAGE_LIMIT = 24;

/**
 * Orquestador del Catálogo de Datasets con soporte de edición e inspección de Ficha Técnica,
 * renombrado (`PATCH`), Hot-Swap (`PUT`), búsqueda unificada con debounce y operaciones en lote.
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
  folders = [],
  onBulkActionFinished,
}) => {
  const { showToast } = useToast();
  const [editingMetadataTable, setEditingMetadataTable] = useState<TableItem | null>(null);
  const [renamingTable, setRenamingTable] = useState<TableItem | null>(null);
  const [hotSwappingTable, setHotSwappingTable] = useState<TableItem | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, TableItem>>({});

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

    tablesService
      .fetchRemoteTables(fetchOptions)
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
  }, [currentPage, pageLimit, activeFolder?.id, searchQuery]);

  const handleTableUpdate = (updated: TableItem) => {
    setLocalOverrides((prev) => ({ ...prev, [updated.id]: updated }));
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
        if (!matchesFolder) return false;
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
    if (filteredTables.length <= pageLimit) return filteredTables;
    const start = (currentPage - 1) * pageLimit;
    return filteredTables.slice(start, start + pageLimit);
  }, [filteredTables, currentPage, pageLimit]);

  // Hook de selección múltiple para acciones en lote
  const bulk = useBulkSelection(visibleTables);

  const handleConfirmBulkDelete = async () => {
    try {
      const res = await bulkService.bulkDeleteTables(bulk.selectedIds);
      showToast(`${res.successful.length} datasets eliminados en lote exitosamente`, 'success');
      bulk.clearSelection();
      onBulkActionFinished?.();
    } catch (err: any) {
      showToast(err?.detail || err?.message || 'Error en la eliminación en lote de tablas', 'error');
    }
  };

  const handleConfirmBulkMove = async (targetFolderId: string) => {
    try {
      const res = await bulkService.bulkMoveTables(bulk.selectedIds, targetFolderId);
      showToast(`${res.successful.length} datasets movidos exitosamente a la carpeta`, 'success');
      bulk.clearSelection();
      onBulkActionFinished?.();
    } catch (err: any) {
      showToast(err?.detail || err?.message || 'Error al mover tablas en lote', 'error');
    }
  };

  return (
    <div className={styles.container} data-testid="tables-catalog-view">
      <TablesToolbar
        activeFolder={activeFolder}
        totalTablesCount={filteredTables.length}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        showPagination={showPagination}
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        onOpenUpload={onOpenUpload}
      />

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
              isSelected={bulk.isSelected(table.id)}
              onToggleSelect={() => bulk.toggleSelect(table.id)}
              onOpenStudio={onOpenStudio}
              onDelete={onDeleteTable}
              onMoveToFolder={onMoveTableToFolder}
              onEditMetadata={setEditingMetadataTable}
              onRename={setRenamingTable}
              onHotSwap={setHotSwappingTable}
            />
          ))}
        </div>
      )}

      <BulkActionBar
        selectedCount={bulk.selectedCount}
        totalCount={visibleTables.length}
        onClearSelection={bulk.clearSelection}
        onSelectAll={bulk.selectAll}
        onOpenBulkMove={bulk.openBulkMove}
        onOpenBulkDelete={bulk.openBulkDelete}
        itemLabel="datasets"
      />

      <BulkDeleteModal
        isOpen={bulk.isBulkDeleteOpen}
        onClose={bulk.closeBulkDelete}
        selectedCount={bulk.selectedCount}
        itemLabel="datasets"
        onConfirm={handleConfirmBulkDelete}
      />

      <BulkMoveModal
        isOpen={bulk.isBulkMoveOpen}
        onClose={bulk.closeBulkMove}
        selectedCount={bulk.selectedCount}
        category="table"
        folders={folders}
        onConfirm={handleConfirmBulkMove}
      />

      <TableMetadataEditorModal
        table={editingMetadataTable}
        isOpen={!!editingMetadataTable}
        onClose={() => setEditingMetadataTable(null)}
        onMetadataSaved={handleTableUpdate}
      />

      <RenameTableModal
        table={renamingTable}
        isOpen={!!renamingTable}
        onClose={() => setRenamingTable(null)}
        onTableRenamed={handleTableUpdate}
      />

      <HotSwapTableModal
        table={hotSwappingTable}
        isOpen={!!hotSwappingTable}
        onClose={() => setHotSwappingTable(null)}
        onTableReplaced={handleTableUpdate}
      />
    </div>
  );
};
