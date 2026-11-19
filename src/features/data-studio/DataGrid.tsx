import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Combine } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  classifySemanticStatus,
  groupHeaderRow,
  resolveCellInlineStyle,
} from './dataGridHelpers';
import type { TableCellStyle, TablePaginationMeta } from '../../types/api';
import styles from './DataGrid.module.css';

/**
 * Propiedades de la grilla editorial densa de Data Studio (`DataGrid`).
 */
export interface DataGridProps {
  /** Columnas canónicas del dataset. */
  columns: string[];
  /** Filas visibles (ya filtradas y ordenadas). */
  rows: Record<string, unknown>[];
  /** Cabeceras multinivel opcionales provistas por el backend (`string[][]`). */
  headers?: string[][];
  /** Rangos de celdas combinadas detectados en hojas Excel (ej. `B1:C1`). */
  merges?: string[];
  /** Estilos por celda devueltos por el backend (`bold`, `italic`, `align`, `bg`, `color`). */
  cellStyles?: Record<string, Record<string, TableCellStyle> | TableCellStyle>;
  /** Glosario opcional de descripciones por columna (`metadataCard.columnsMeta`). */
  columnsMeta?: Record<string, string>;
  /** Metadatos de paginación server-side. */
  meta: TablePaginationMeta;
  /** Indica si hay una recarga en curso entre páginas. */
  isFetching?: boolean;
  /** Término activo de búsqueda local. */
  searchQuery: string;
  /** Columna ordenada actualmente. */
  sortCol: string | null;
  /** Dirección de ordenamiento. */
  sortDir: 'asc' | 'desc';
  /** Alterna el ordenamiento sobre una columna. */
  onSort: (column: string) => void;
  /** Cambia la página solicitada al servidor. */
  onPageChange: (nextPage: number) => void;
  /** Cambia el tamaño de página server-side. */
  onLimitChange: (nextLimit: number) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

/**
 * Grilla tabular densa "Archivo Editorial" con números tabulares (`tabular-nums`),
 * soporte de `headers` multinivel, `merges`, `cellStyles`, `content-visibility: auto`
 * en filas y paginación server-side fluida.
 */
export const DataGrid: React.FC<DataGridProps> = ({
  columns,
  rows,
  headers,
  merges,
  cellStyles,
  columnsMeta,
  meta,
  isFetching = false,
  searchQuery,
  sortCol,
  sortDir,
  onSort,
  onPageChange,
  onLimitChange,
}) => {
  const extraHeaderRows =
    headers && headers.length > 1 ? headers.slice(0, headers.length - 1) : [];
  const startRowNumber = (meta.page - 1) * meta.limit + 1;

  return (
    <div className={styles.wrapper} data-testid="data-studio-grid">
      {merges && merges.length > 0 ? (
        <div className={styles.mergesBanner} data-testid="merges-indicator">
          <Combine size={13} className={styles.mergesIcon} aria-hidden="true" />
          <span>
            Celdas combinadas ({merges.length}):{' '}
            <span className={styles.mergesCodes}>{merges.slice(0, 8).join(', ')}</span>
          </span>
        </div>
      ) : null}

      <div className={styles.scrollArea}>
        {rows.length === 0 ? (
          <div className={styles.emptyCell}>
            {searchQuery
              ? `No se encontraron filas en esta página para "${searchQuery}".`
              : 'El dataset no contiene filas visibles en esta página.'}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              {extraHeaderRows.map((headerRow, hIdx) => {
                const grouped = groupHeaderRow(headerRow, columns.length);
                return (
                  <tr key={`mh-${hIdx}`} data-testid={`multi-header-row-${hIdx}`}>
                    <th className={styles.thIndex} aria-hidden="true" />
                    {grouped.map((grp, gIdx) => (
                      <th
                        key={`${hIdx}-${gIdx}`}
                        colSpan={grp.span}
                        className={`${styles.thGroup} ${
                          grp.span > 1 ? styles.thGroupCentered : ''
                        }`}
                      >
                        {grp.label}
                      </th>
                    ))}
                  </tr>
                );
              })}

              <tr>
                <th className={styles.thIndex}>#</th>
                {columns.map((col) => {
                  const isSorted = sortCol === col;
                  const description = columnsMeta?.[col];
                  return (
                    <th key={col} className={styles.thCol} title={description || col}>
                      <button
                        type="button"
                        className={`${styles.sortBtn} ${isSorted ? styles.sortActive : ''}`}
                        onClick={() => onSort(col)}
                      >
                        <span>{col}</span>
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ArrowUp size={12} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={12} aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown size={12} aria-hidden="true" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={`row-${startRowNumber + rowIdx}`} className={styles.bodyRow}>
                  <td className={styles.tdIndex}>{startRowNumber + rowIdx}</td>
                  {columns.map((col, colIdx) => {
                    const value = row[col];
                    const cellStyle = resolveCellInlineStyle(cellStyles, rowIdx, col, colIdx);
                    const tone = classifySemanticStatus(value);
                    return (
                      <td
                        key={`${rowIdx}-${col}`}
                        className={styles.td}
                        style={cellStyle}
                        title={value !== null && value !== undefined ? String(value) : undefined}
                      >
                        {value === null || value === undefined || value === '' ? (
                          <span className={styles.nullValue}>—</span>
                        ) : tone ? (
                          <Badge tone={tone} mono>
                            {String(value)}
                          </Badge>
                        ) : (
                          String(value)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <footer className={styles.footer} data-testid="data-grid-pagination">
        <span className={styles.paginationInfo}>
          {meta.total} {meta.total === 1 ? 'fila' : 'filas'} · Página {meta.page} de{' '}
          {Math.max(1, meta.totalPages)}
          {isFetching ? ' · Actualizando...' : ''}
        </span>

        <div className={styles.paginationControls}>
          <select
            aria-label="Filas por página"
            className={styles.limitSelect}
            value={meta.limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / pág.
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronLeft size={14} />}
            disabled={meta.page <= 1 || isFetching}
            onClick={() => onPageChange(meta.page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            iconRight={<ChevronRight size={14} />}
            disabled={!meta.hasNext && meta.page >= meta.totalPages || isFetching}
            onClick={() => onPageChange(meta.page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </footer>
    </div>
  );
};
