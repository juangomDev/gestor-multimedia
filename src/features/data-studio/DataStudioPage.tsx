import React, { useDeferredValue, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ArrowLeft, Download, FileSpreadsheet, Pencil, RefreshCw, Search, Table2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ShortCodeChip } from '../../components/ui/ShortCodeChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTableDataQuery, useTablesQuery } from '../../queries/useMediaQueries';
import { tablesService } from '../../services/tablesService';
import { storageService } from '../../services/storageService';
import { buildPublicAssetUrl } from '../../utils/formatters';
import { useFolderWriteAccess } from '../explorer/useFolderWriteAccess';
import { RenameAssetDialog } from '../images/RenameAssetDialog';
import { HotSwapAssetDialog } from '../images/HotSwapAssetDialog';
import { DataGrid } from './DataGrid';
import { filterAndSortRows, resolveFatherHierarchyConfig, type HierarchyCrumb } from './dataGridHelpers';
import { TableDynamicFilterBar } from './TableDynamicFilterBar';
import { TableMetadataDialog } from './TableMetadataDialog';
import type { MetadataCard, TableDataQueryOptions } from '../../types/api';
import styles from './DataStudioPage.module.css';

interface DataStudioRouteState {
  folderId?: string;
  folderName?: string;
  tableId?: string;
  canEdit?: boolean;
}

/**
 * Vista Data Studio a pantalla completa (`/tables/:shortCode`), cargada de forma diferida
 * (`React.lazy`) para consultar, filtrar dinámicamente en servidor (`?search=`, `?select=`,
 * `?father=null`, `?col=v1,v2`), ordenar, documentar (`TableMetadataDialog`) y reemplazar en caliente.
 */
export const DataStudioPage: React.FC = () => {
  const { shortCode = '' } = useParams<{ shortCode: string }>();
  const location = useLocation();
  const routeState = (location.state as DataStudioRouteState | null) ?? null;

  const [trackedCode, setTrackedCode] = useState(shortCode);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [serverSearch, setServerSearch] = useState('');
  const deferredServerSearch = useDeferredValue(serverSearch);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [hierarchyTrail, setHierarchyTrail] = useState<HierarchyCrumb[]>([]);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [hotSwapOpen, setHotSwapOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  if (trackedCode !== shortCode) {
    setTrackedCode(shortCode);
    setPage(1);
    setSearchQuery('');
    setServerSearch('');
    setColumnFilters({});
    setSelectedColumns([]);
    setHierarchyTrail([]);
    setSortCol(null);
    setSortDir('asc');
    setMetadataOpen(false);
    setHotSwapOpen(false);
    setRenameOpen(false);
  }

  const filterOptions = useMemo<Omit<TableDataQueryOptions, 'page' | 'limit'>>(
    () => ({
      search: deferredServerSearch.trim() || undefined,
      select: selectedColumns.length > 0 ? selectedColumns : undefined,
      filters: Object.keys(columnFilters).length > 0 ? columnFilters : undefined,
    }),
    [deferredServerSearch, selectedColumns, columnFilters]
  );

  const dataQuery = useTableDataQuery(shortCode, page, limit, filterOptions);
  const needsCatalogLookup = Boolean(shortCode && (!routeState?.tableId || routeState?.canEdit === undefined));
  const lookupQuery = useTablesQuery({ search: shortCode, limit: 20 }, needsCatalogLookup);
  const matchedCatalogItem = useMemo(
    () => lookupQuery.data?.items.find((t) => t.shortCode === shortCode),
    [lookupQuery.data, shortCode]
  );

  const resolvedTableId = routeState?.tableId || dataQuery.data?.id || matchedCatalogItem?.id || null;
  const resolvedFolderId = routeState?.folderId || matchedCatalogItem?.folderId || null;
  const backPath = resolvedFolderId ? `/folder/${resolvedFolderId}` : '/';
  const backLabel = routeState?.folderName || (resolvedFolderId ? 'Volver a carpeta' : 'Explorador');
  const canEdit = useFolderWriteAccess(resolvedFolderId, routeState?.canEdit);

  const tableName = dataQuery.data?.tableName || matchedCatalogItem?.tableName || `Tabla ${shortCode}`;
  const rawRows = useMemo(() => dataQuery.data?.data ?? [], [dataQuery.data?.data]);
  const gridColumns = useMemo(
    () => dataQuery.data?.columns ?? (rawRows[0] ? Object.keys(rawRows[0]) : []),
    [dataQuery.data?.columns, rawRows]
  );
  const allColumns = useMemo(() => {
    const base = matchedCatalogItem?.columns?.length ? matchedCatalogItem.columns : gridColumns;
    return Array.from(new Set([...base, ...gridColumns]));
  }, [matchedCatalogItem?.columns, gridColumns]);

  const metadataCard = (dataQuery.data?.metadataCard ?? matchedCatalogItem?.metadataCard ?? null) as MetadataCard | null;
  const hierarchyConfig = useMemo(
    () => resolveFatherHierarchyConfig(allColumns, metadataCard?.columnsMeta),
    [allColumns, metadataCard?.columnsMeta]
  );
  const visibleRows = useMemo(
    () => filterAndSortRows(rawRows, gridColumns, deferredSearch, sortCol, sortDir),
    [rawRows, gridColumns, deferredSearch, sortCol, sortDir]
  );

  const canonicalUrl = buildPublicAssetUrl(storageService.getApiBaseUrl(), 't', shortCode);
  const downloadUrl = tablesService.getDownloadUrl(shortCode);
  const liveRowsApiUrl = useMemo(
    () => tablesService.getTableQueryUrl(shortCode, { ...filterOptions, format: 'rows' }),
    [shortCode, filterOptions]
  );

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleDrillDownRow = (row: Record<string, unknown>) => {
    if (!hierarchyConfig) return;
    const rawId = row[hierarchyConfig.idColumn];
    if (rawId === null || rawId === undefined || String(rawId).trim() === '') return;
    const idValue = String(rawId).trim();
    const rawLabel = row[hierarchyConfig.labelColumn];
    const label =
      rawLabel !== null && rawLabel !== undefined && String(rawLabel).trim() !== '' && String(rawLabel) !== idValue
        ? `${String(rawLabel)} (#${idValue})`
        : `#${idValue}`;
    setHierarchyTrail((prev) => [...prev, { idValue, label }]);
    setColumnFilters((prev) => ({ ...prev, [hierarchyConfig.fatherColumn]: idValue }));
    setPage(1);
  };

  const handleNavigateHierarchyCrumb = (index: number) => {
    if (!hierarchyConfig) return;
    if (index < 0) {
      setHierarchyTrail([]);
      setColumnFilters((prev) => ({ ...prev, [hierarchyConfig.fatherColumn]: 'null' }));
    } else {
      const target = hierarchyTrail[index];
      if (!target) return;
      setHierarchyTrail((prev) => prev.slice(0, index + 1));
      setColumnFilters((prev) => ({ ...prev, [hierarchyConfig.fatherColumn]: target.idValue }));
    }
    setPage(1);
  };

  const hasMetaCard = Boolean(
    metadataCard && (metadataCard.title || metadataCard.description || metadataCard.unit || metadataCard.tags?.length)
  );

  return (
    <div className={styles.page} data-testid="data-studio-page">
      <header className={styles.header}>
        <div className={styles.leftCluster}>
          <Link to={backPath}>
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />}>
              {backLabel}
            </Button>
          </Link>
          <h1 className={styles.title}>{tableName}</h1>
          {shortCode ? <ShortCodeChip prefix="t" shortCode={shortCode} copyValue={canonicalUrl} /> : null}
        </div>

        <div className={styles.rightCluster}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Filtrar filas visibles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filtrar filas del dataset"
            />
            {searchQuery ? (
              <button type="button" className={styles.clearBtn} onClick={() => setSearchQuery('')} aria-label="Limpiar filtro">
                <X size={13} />
              </button>
            ) : null}
          </div>

          <a href={downloadUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" icon={<Download size={14} />}>
              Descargar original
            </Button>
          </a>

          {canEdit && resolvedTableId ? (
            <>
              <Button variant="secondary" size="sm" icon={<FileSpreadsheet size={14} />} onClick={() => setMetadataOpen(true)} data-testid="open-table-metadata-btn">
                Ficha técnica
              </Button>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => setHotSwapOpen(true)} data-testid="open-table-hotswap-btn">
                Hot-Swap
              </Button>
              <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setRenameOpen(true)} aria-label="Renombrar tabla" />
            </>
          ) : null}
        </div>
      </header>

      {hasMetaCard && metadataCard ? (
        <section className={styles.metaCardStrip} aria-label="Resumen de Ficha Técnica">
          <div className={styles.metaCardCopy}>
            {metadataCard.title ? <span className={styles.metaCardTitle}>{metadataCard.title}</span> : null}
            {metadataCard.description ? <p className={styles.metaCardDesc}>{metadataCard.description}</p> : null}
          </div>
          <div className={styles.metaBadges}>
            {metadataCard.unit ? <Badge mono>Unidad: {metadataCard.unit}</Badge> : null}
            {metadataCard.hasSummaryRows ? <Badge tone="warn">Con subtotales</Badge> : null}
            {metadataCard.tags?.map((tag) => (
              <Badge key={tag} tone="accent">{tag}</Badge>
            ))}
          </div>
        </section>
      ) : null}

      <TableDynamicFilterBar
        allColumns={allColumns}
        columnsMeta={metadataCard?.columnsMeta}
        hierarchyConfig={hierarchyConfig}
        hierarchyTrail={hierarchyTrail}
        serverSearch={serverSearch}
        onServerSearchChange={(next) => { setServerSearch(next); setPage(1); }}
        columnFilters={columnFilters}
        onSetColumnFilter={(col, val) => {
          setColumnFilters((prev) => ({ ...prev, [col]: val }));
          if (hierarchyConfig && col === hierarchyConfig.fatherColumn && val === 'null') setHierarchyTrail([]);
          setPage(1);
        }}
        onRemoveColumnFilter={(col) => {
          setColumnFilters((prev) => {
            const next = { ...prev };
            delete next[col];
            return next;
          });
          if (hierarchyConfig && col === hierarchyConfig.fatherColumn) setHierarchyTrail([]);
          setPage(1);
        }}
        selectedColumns={selectedColumns}
        onToggleSelectColumn={(col) => {
          setSelectedColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
          setPage(1);
        }}
        onClearSelectColumns={() => { setSelectedColumns([]); setPage(1); }}
        onShowHierarchyRoots={() => handleNavigateHierarchyCrumb(-1)}
        onNavigateHierarchyCrumb={handleNavigateHierarchyCrumb}
        onResetAllFilters={() => {
          setServerSearch('');
          setColumnFilters({});
          setSelectedColumns([]);
          setHierarchyTrail([]);
          setPage(1);
        }}
        liveRowsApiUrl={liveRowsApiUrl}
      />

      {dataQuery.isLoading ? (
        <Skeleton variant="card" height={300} />
      ) : dataQuery.isError ? (
        <EmptyState icon={<Table2 size={22} />} title="No se pudo cargar el dataset" description={`Verifica que el código t/${shortCode} exista y sea accesible en el servidor.`} />
      ) : (
        <DataGrid
          columns={gridColumns}
          rows={visibleRows}
          rawRows={rawRows}
          headers={dataQuery.data?.headers}
          merges={dataQuery.data?.merges}
          cellStyles={dataQuery.data?.cellStyles}
          columnsMeta={metadataCard?.columnsMeta}
          meta={dataQuery.data?.meta ?? { page, limit, total: rawRows.length, totalPages: 1, hasNext: false }}
          isFetching={dataQuery.isFetching}
          searchQuery={deferredSearch}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          onPageChange={setPage}
          onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }}
          canDrillDownChildren={Boolean(hierarchyConfig)}
          onDrillDownRow={handleDrillDownRow}
        />
      )}

      {resolvedTableId && metadataOpen ? (
        <TableMetadataDialog open={metadataOpen} onOpenChange={setMetadataOpen} tableId={resolvedTableId} tableName={tableName} columns={allColumns} initialMetadata={metadataCard} onSaved={() => void dataQuery.refetch()} />
      ) : null}
      {resolvedTableId && hotSwapOpen ? (
        <HotSwapAssetDialog open={hotSwapOpen} onOpenChange={setHotSwapOpen} kind="table" assetId={resolvedTableId} shortCode={shortCode} currentName={tableName} onReplaced={() => void dataQuery.refetch()} />
      ) : null}
      {resolvedTableId && renameOpen ? (
        <RenameAssetDialog open={renameOpen} onOpenChange={setRenameOpen} kind="table" assetId={resolvedTableId} shortCode={shortCode} currentName={tableName} onRenamed={() => void dataQuery.refetch()} />
      ) : null}
    </div>
  );
};

export default DataStudioPage;
