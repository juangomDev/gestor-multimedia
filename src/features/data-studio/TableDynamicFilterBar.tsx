import React, { useState } from 'react';
import { Columns3, Filter, FolderTree, RotateCcw, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TableActiveQueryStrip } from './TableActiveQueryStrip';
import type { FatherHierarchyConfig, HierarchyCrumb } from './dataGridHelpers';
import styles from './TableDynamicFilterBar.module.css';

/**
 * Propiedades de la barra de filtrado dinámico server-side (`GET /t/:short_code`).
 */
export interface TableDynamicFilterBarProps {
  /** Columnas canónicas del dataset (sin recortar por `?select=`). */
  allColumns: string[];
  /** Glosario o alias de columnas definido en `metadataCard.columnsMeta`. */
  columnsMeta?: Record<string, string>;
  /** Configuración jerárquica Padre/Hijo detectada (`father` / `father_id`), o `null` si no aplica. */
  hierarchyConfig: FatherHierarchyConfig | null;
  /** Rastro de navegación drill-down Padre/Hijo activo. */
  hierarchyTrail: HierarchyCrumb[];
  /** Término de búsqueda global server-side (`?search=`). */
  serverSearch: string;
  /** Actualiza la búsqueda global server-side (`?search=`). */
  onServerSearchChange: (next: string) => void;
  /** Mapa de filtros activos por columna o alias (`{ father: '15', Estado: 'Miranda,Zulia' }`). */
  columnFilters: Record<string, string>;
  /** Añade o actualiza un filtro de columna/alias (`?col=val` o `?col=null`). */
  onSetColumnFilter: (columnOrAlias: string, value: string) => void;
  /** Elimina un filtro de columna específico. */
  onRemoveColumnFilter: (columnOrAlias: string) => void;
  /** Columnas seleccionadas para proyección (`?select=col1,col2`). Vacío = todas. */
  selectedColumns: string[];
  /** Alterna una columna dentro de la proyección `?select=`. */
  onToggleSelectColumn: (column: string) => void;
  /** Limpia la proyección `?select=` para mostrar todas las columnas. */
  onClearSelectColumns: () => void;
  /** Activa el filtro de entidades raíz (`?father=null`). */
  onShowHierarchyRoots: () => void;
  /** Salta a un nivel específico del breadcrumb jerárquico (`-1` para raíz `?father=null`). */
  onNavigateHierarchyCrumb: (index: number) => void;
  /** Limpia todos los filtros server-side (`search`, `filters`, `select` y breadcrumb). */
  onResetAllFilters: () => void;
  /** URL pública viva con `?format=rows` lista para copiar. */
  liveRowsApiUrl: string;
}

/**
 * Barra editorial de filtrado dinámico server-side para `GET /t/:short_code`.
 * Soporta búsqueda global sin acentos (`?search=`), filtros por cualquier columna o alias
 * (`?col=v1,v2`, `?father=null`), exploración jerárquica Padre/Hijo, proyección `?select=`
 * y copiado instantáneo del endpoint `?format=rows`.
 */
export const TableDynamicFilterBar: React.FC<TableDynamicFilterBarProps> = ({
  allColumns,
  columnsMeta,
  hierarchyConfig,
  hierarchyTrail,
  serverSearch,
  onServerSearchChange,
  columnFilters,
  onSetColumnFilter,
  onRemoveColumnFilter,
  selectedColumns,
  onToggleSelectColumn,
  onClearSelectColumns,
  onShowHierarchyRoots,
  onNavigateHierarchyCrumb,
  onResetAllFilters,
  liveRowsApiUrl,
}) => {
  const [selectedField, setSelectedField] = useState<string>('');
  const [filterValueDraft, setFilterValueDraft] = useState<string>('');
  const [showColumnPicker, setShowColumnPicker] = useState<boolean>(false);

  const activeField =
    selectedField && allColumns.includes(selectedField)
      ? selectedField
      : hierarchyConfig?.fatherColumn || allColumns[0] || '';

  const activeFilterEntries = Object.entries(columnFilters).filter(
    ([, val]) => val !== undefined && val !== ''
  );
  const hasAnyActiveFilter =
    Boolean(serverSearch.trim()) ||
    activeFilterEntries.length > 0 ||
    selectedColumns.length > 0;

  const fatherKey = hierarchyConfig?.fatherColumn;
  const fatherAlias = hierarchyConfig?.fatherAlias;
  const activeFatherValue = fatherKey
    ? columnFilters[fatherKey] ?? (fatherAlias ? columnFilters[fatherAlias] : undefined)
    : undefined;
  const isShowingRoots = activeFatherValue === 'null';

  const handleApplyColumnFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const targetField = selectedField || activeField;
    const trimmedVal = filterValueDraft.trim();
    if (!targetField || !trimmedVal) return;
    onSetColumnFilter(targetField, trimmedVal);
    setFilterValueDraft('');
  };

  const handleApplyNullFilter = () => {
    const targetField = selectedField || activeField;
    if (!targetField) return;
    onSetColumnFilter(targetField, 'null');
    setFilterValueDraft('');
  };

  return (
    <section
      className={styles.panel}
      aria-label="Motor de filtrado dinámico del servidor"
      data-testid="table-dynamic-filter-bar"
    >
      <div className={styles.topRow}>
        <div className={styles.serverSearchWrap}>
          <Search size={13} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.serverSearchInput}
            placeholder="Búsqueda global sin acentos (?search=bolivar)..."
            value={serverSearch}
            onChange={(e) => onServerSearchChange(e.target.value)}
            aria-label="Búsqueda global en servidor"
            data-testid="server-search-input"
          />
          {serverSearch ? (
            <button
              type="button"
              className={styles.inlineClearBtn}
              onClick={() => onServerSearchChange('')}
              aria-label="Limpiar búsqueda global"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>

        <form className={styles.columnFilterForm} onSubmit={handleApplyColumnFilter}>
          <Filter size={13} className={styles.filterIcon} aria-hidden="true" />
          <select
            aria-label="Columna o alias a filtrar"
            className={styles.columnSelect}
            value={selectedField || activeField}
            onChange={(e) => setSelectedField(e.target.value)}
            data-testid="filter-column-select"
          >
            {allColumns.map((col) => {
              const meta = columnsMeta?.[col];
              const isAlias = meta && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(meta.trim()) && meta.trim() !== col;
              return (
                <React.Fragment key={col}>
                  <option value={col}>{isAlias ? `${col} (alias: ${meta.trim()})` : col}</option>
                  {isAlias ? <option value={meta.trim()}>{`${meta.trim()} → ${col}`}</option> : null}
                </React.Fragment>
              );
            })}
          </select>

          <input
            type="text"
            className={styles.valueInput}
            placeholder="Valor o lista (ej. 15 o Miranda,Zulia)"
            value={filterValueDraft}
            onChange={(e) => setFilterValueDraft(e.target.value)}
            aria-label="Valor de filtro por columna"
            data-testid="filter-value-input"
          />

          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={!filterValueDraft.trim() || !activeField}
            data-testid="apply-column-filter-btn"
          >
            Filtrar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleApplyNullFilter}
            disabled={!activeField}
            title="Filtrar registros donde esta columna es null o vacía (?col=null)"
            data-testid="apply-null-filter-btn"
          >
            = null
          </Button>
        </form>

        <div className={styles.rightActions}>
          {hierarchyConfig ? (
            <Button
              type="button"
              variant={isShowingRoots ? 'primary' : 'secondary'}
              size="sm"
              icon={<FolderTree size={13} />}
              onClick={onShowHierarchyRoots}
              data-testid="hierarchy-roots-btn"
            >
              Raíces ({hierarchyConfig.fatherColumn}=null)
            </Button>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Columns3 size={13} />}
            onClick={() => setShowColumnPicker((prev) => !prev)}
            data-testid="toggle-select-columns-btn"
          >
            Columnas ({selectedColumns.length > 0 ? `${selectedColumns.length}/${allColumns.length}` : 'Todas'})
          </Button>

          {hasAnyActiveFilter ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={onResetAllFilters}
              data-testid="reset-all-table-filters-btn"
            >
              Restablecer
            </Button>
          ) : null}
        </div>
      </div>

      <TableActiveQueryStrip
        allColumns={allColumns}
        showColumnPicker={showColumnPicker}
        selectedColumns={selectedColumns}
        onToggleSelectColumn={onToggleSelectColumn}
        onClearSelectColumns={onClearSelectColumns}
        hierarchyConfig={hierarchyConfig}
        isShowingRoots={isShowingRoots}
        hierarchyTrail={hierarchyTrail}
        onNavigateHierarchyCrumb={onNavigateHierarchyCrumb}
        serverSearch={serverSearch}
        activeFilterEntries={activeFilterEntries}
        onRemoveColumnFilter={onRemoveColumnFilter}
        liveRowsApiUrl={liveRowsApiUrl}
      />
    </section>
  );
};
