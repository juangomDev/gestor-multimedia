import React, { useState } from 'react';
import { Check, ChevronRight, Copy, FolderTree, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/useToast';
import { copyToClipboard } from '../../utils/clipboard';
import type { FatherHierarchyConfig, HierarchyCrumb } from './dataGridHelpers';
import styles from './TableDynamicFilterBar.module.css';

/**
 * Propiedades de la franja de estado de consulta activa, proyección, breadcrumb jerárquico y URL API (`?format=rows`).
 */
export interface TableActiveQueryStripProps {
  allColumns: string[];
  showColumnPicker: boolean;
  selectedColumns: string[];
  onToggleSelectColumn: (column: string) => void;
  onClearSelectColumns: () => void;
  hierarchyConfig: FatherHierarchyConfig | null;
  isShowingRoots: boolean;
  hierarchyTrail: HierarchyCrumb[];
  onNavigateHierarchyCrumb: (index: number) => void;
  serverSearch: string;
  activeFilterEntries: Array<[string, string]>;
  onRemoveColumnFilter: (columnOrAlias: string) => void;
  liveRowsApiUrl: string;
}

/**
 * Franja inferior del motor de filtrado dinámico: selector de proyección `?select=`,
 * breadcrumb Padre/Hijo (`?father=`), chips de filtros activos y barra de endpoint `?format=rows`.
 */
export const TableActiveQueryStrip: React.FC<TableActiveQueryStripProps> = ({
  allColumns,
  showColumnPicker,
  selectedColumns,
  onToggleSelectColumn,
  onClearSelectColumns,
  hierarchyConfig,
  isShowingRoots,
  hierarchyTrail,
  onNavigateHierarchyCrumb,
  serverSearch,
  activeFilterEntries,
  onRemoveColumnFilter,
  liveRowsApiUrl,
}) => {
  const { showToast } = useToast();
  const [copiedApiUrl, setCopiedApiUrl] = useState(false);

  const handleCopyApiUrl = async () => {
    const ok = await copyToClipboard(liveRowsApiUrl);
    if (ok) {
      setCopiedApiUrl(true);
      showToast('URL de consulta (?format=rows) copiada al portapapeles.', 'success');
      window.setTimeout(() => setCopiedApiUrl(false), 1800);
    } else {
      showToast('No se pudo copiar la URL.', 'error');
    }
  };

  return (
    <>
      {showColumnPicker && allColumns.length > 0 ? (
        <div className={styles.projectionRow} data-testid="column-projection-picker">
          <span className={styles.rowLabel}>Proyección (?select=):</span>
          <div className={styles.chipsCluster}>
            <button
              type="button"
              className={`${styles.colChip} ${selectedColumns.length === 0 ? styles.colChipActive : ''}`}
              onClick={onClearSelectColumns}
            >
              Todas ({allColumns.length})
            </button>
            {allColumns.map((col) => {
              const active = selectedColumns.includes(col);
              return (
                <button
                  key={col}
                  type="button"
                  className={`${styles.colChip} ${active ? styles.colChipActive : ''}`}
                  onClick={() => onToggleSelectColumn(col)}
                  data-testid={`select-col-chip-${col}`}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {hierarchyConfig && (isShowingRoots || hierarchyTrail.length > 0) ? (
        <nav
          className={styles.hierarchyNav}
          aria-label="Ruta jerárquica Padre/Hijo"
          data-testid="hierarchy-breadcrumb"
        >
          <FolderTree size={13} className={styles.hierarchyIcon} aria-hidden="true" />
          <button
            type="button"
            className={`${styles.crumbBtn} ${hierarchyTrail.length === 0 ? styles.crumbCurrent : ''}`}
            onClick={() => onNavigateHierarchyCrumb(-1)}
          >
            Raíces ({hierarchyConfig.fatherColumn}=null)
          </button>
          {hierarchyTrail.map((crumb, idx) => (
            <React.Fragment key={`${crumb.idValue}-${idx}`}>
              <ChevronRight size={12} className={styles.crumbSep} aria-hidden="true" />
              <button
                type="button"
                className={`${styles.crumbBtn} ${
                  idx === hierarchyTrail.length - 1 ? styles.crumbCurrent : ''
                }`}
                onClick={() => onNavigateHierarchyCrumb(idx)}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </nav>
      ) : null}

      {activeFilterEntries.length > 0 || selectedColumns.length > 0 || serverSearch.trim() ? (
        <div className={styles.activeFiltersRow} data-testid="active-table-filters">
          <span className={styles.rowLabel}>Filtros activos:</span>
          <div className={styles.chipsCluster}>
            {serverSearch.trim() ? (
              <Badge tone="accent" mono>
                search={serverSearch.trim()}
              </Badge>
            ) : null}
            {activeFilterEntries.map(([col, val]) => (
              <span key={col} className={styles.activeFilterPill} data-testid={`active-filter-${col}`}>
                <code>
                  {col}={val}
                </code>
                <button
                  type="button"
                  className={styles.removeFilterBtn}
                  onClick={() => onRemoveColumnFilter(col)}
                  aria-label={`Quitar filtro ${col}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            {selectedColumns.length > 0 ? (
              <Badge tone="neutral" mono>
                select={selectedColumns.join(',')}
              </Badge>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={styles.apiBar}>
        <div className={styles.apiUrlBox}>
          <span className={styles.apiMethod}>GET</span>
          <code className={styles.apiCode} data-testid="table-live-api-url">
            {liveRowsApiUrl}
          </code>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={copiedApiUrl ? <Check size={13} /> : <Copy size={13} />}
          onClick={() => void handleCopyApiUrl()}
          data-testid="copy-table-api-url-btn"
        >
          {copiedApiUrl ? 'Copiada' : 'Copiar URL (format=rows)'}
        </Button>
      </div>
    </>
  );
};
