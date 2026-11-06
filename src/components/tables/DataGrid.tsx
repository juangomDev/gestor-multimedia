import React from 'react';
import { ArrowUpDown, Combine } from 'lucide-react';
import type { TableCellStyle } from '../../types/api';
import styles from '../../views/TableDataStudioView.module.css';

/**
 * Propiedades del componente de grilla de datos tabulares de alta densidad con soporte de formato rico.
 */
export interface DataGridProps {
  columns: string[];
  rows: Record<string, any>[];
  rawRowsCount: number;
  loading: boolean;
  searchQuery: string;
  page: number;
  limit: number;
  sortCol: string | null;
  onSort: (column: string) => void;
  headers?: string[][];
  merges?: string[];
  cellStyles?: Record<string, Record<string, TableCellStyle> | TableCellStyle>;
}

/**
 * Formatea el contenido de una celda detectando valores nulos y estados semánticos (`ACTIVE`, `PENDING`, `FAILED`).
 *
 * @param value Valor crudo de la celda.
 * @returns Nodo React formateado.
 */
function renderCellContent(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>null</span>;
  }

  const str = String(value);
  const upper = str.toUpperCase();

  if (upper === 'ACTIVE' || upper === 'COMPLETADO' || upper === 'SUCCESS') {
    return <span className={`${styles.statusBadge} ${styles.statusActive}`}>{str}</span>;
  }
  if (upper === 'PENDING' || upper === 'EN_PROGRESO' || upper === 'OBSERVACION') {
    return <span className={`${styles.statusBadge} ${styles.statusPending}`}>{str}</span>;
  }
  if (upper === 'FAILED' || upper === 'ERROR' || upper === 'INACTIVE') {
    return <span className={`${styles.statusBadge} ${styles.statusFailed}`}>{str}</span>;
  }

  return str;
}

/**
 * Resuelve el objeto `CSSProperties` para una celda a partir del mapa `cellStyles` devuelto por el backend.
 */
function resolveCellStyle(
  cellStyles: DataGridProps['cellStyles'],
  rowIdx: number,
  colName: string,
  colIdx: number
): React.CSSProperties | undefined {
  if (!cellStyles) return undefined;

  let rawStyle: TableCellStyle | undefined;
  const rowBucket = cellStyles[String(rowIdx)];
  if (rowBucket && typeof rowBucket === 'object' && !('bold' in rowBucket) && !('bg' in rowBucket)) {
    const mapBucket = rowBucket as Record<string, TableCellStyle>;
    rawStyle = mapBucket[colName] || mapBucket[String(colIdx)];
  } else {
    rawStyle =
      (cellStyles[`${rowIdx}:${colName}`] as TableCellStyle | undefined) ||
      (cellStyles[`${rowIdx}:${colIdx}`] as TableCellStyle | undefined);
  }

  if (!rawStyle) return undefined;

  const css: React.CSSProperties = {};
  if (rawStyle.bg || rawStyle.backgroundColor) {
    css.backgroundColor = rawStyle.bg || rawStyle.backgroundColor;
  }
  if (rawStyle.color) {
    css.color = rawStyle.color;
  }
  if (rawStyle.bold) {
    css.fontWeight = 700;
  }
  if (rawStyle.italic) {
    css.fontStyle = 'italic';
  }
  if (rawStyle.align) {
    css.textAlign = rawStyle.align;
  }

  return Object.keys(css).length > 0 ? css : undefined;
}

/**
 * Agrupa cabeceras consecutivas idénticas en una fila multinivel para representar celdas combinadas (`colSpan`).
 */
function groupHeaderRow(headerRow: string[], targetLength: number): Array<{ label: string; span: number }> {
  const normalized = Array.from({ length: targetLength }, (_, i) => headerRow[i] ?? '');
  const groups: Array<{ label: string; span: number }> = [];

  for (const label of normalized) {
    const prev = groups[groups.length - 1];
    if (prev && prev.label === label && label !== '') {
      prev.span += 1;
    } else {
      groups.push({ label, span: 1 });
    }
  }
  return groups;
}

/**
 * Grilla de datos de alta densidad con cabeceras multinivel (`headers`), celdas combinadas (`merges`)
 * y estilos dinámicos por celda (`cellStyles`).
 */
export const DataGrid: React.FC<DataGridProps> = ({
  columns,
  rows,
  rawRowsCount,
  loading,
  searchQuery,
  page,
  limit,
  sortCol,
  onSort,
  headers,
  merges,
  cellStyles,
}) => {
  const extraHeaderRows =
    headers && headers.length > 1 ? headers.slice(0, headers.length - 1) : [];

  return (
    <div className={styles.gridContainer}>
      {merges && merges.length > 0 && (
        <div
          data-testid="merges-indicator"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'rgba(59, 130, 246, 0.08)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Combine size={13} style={{ color: 'var(--accent-primary)' }} />
          <span>
            Celdas agrupadas detectadas ({merges.length}):{' '}
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
              {merges.slice(0, 6).join(', ')}
            </strong>
          </span>
        </div>
      )}

      {loading && rawRowsCount === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
          }}
        >
          Cargando dataset desde el servidor...
        </div>
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
          }}
        >
          {searchQuery
            ? 'No se encontraron filas que coincidan con la búsqueda.'
            : 'El archivo no contiene filas de datos.'}
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            {extraHeaderRows.map((hRow, hIdx) => {
              const grouped = groupHeaderRow(hRow, columns.length);
              return (
                <tr key={`multi-header-${hIdx}`} data-testid={`multi-header-row-${hIdx}`}>
                  <th
                    className={styles.th}
                    style={{ width: 50, textAlign: 'center', cursor: 'default' }}
                  />
                  {grouped.map((grp, gIdx) => (
                    <th
                      key={`${hIdx}-${gIdx}`}
                      colSpan={grp.span}
                      className={styles.th}
                      style={{
                        textAlign: grp.span > 1 ? 'center' : 'left',
                        background: 'rgba(59, 130, 246, 0.09)',
                        color: 'var(--accent-primary)',
                        fontWeight: 700,
                      }}
                    >
                      {grp.label}
                    </th>
                  ))}
                </tr>
              );
            })}
            <tr>
              <th
                className={styles.th}
                style={{ width: 50, textAlign: 'center', cursor: 'default' }}
              >
                #
              </th>
              {columns.map((col) => (
                <th key={col} className={styles.th} onClick={() => onSort(col)}>
                  <div className={styles.thContent}>
                    <span>{col}</span>
                    <ArrowUpDown size={12} style={{ opacity: sortCol === col ? 1 : 0.4 }} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className={`${styles.row} ${idx % 2 === 1 ? styles.rowStriped : ''}`}
              >
                <td
                  className={styles.td}
                  style={{
                    width: 50,
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                  }}
                >
                  {(page - 1) * limit + idx + 1}
                </td>
                {columns.map((col, colIdx) => {
                  const customStyle = resolveCellStyle(cellStyles, idx, col, colIdx);
                  return (
                    <td
                      key={col}
                      className={styles.td}
                      style={customStyle}
                      data-testid={`cell-${idx}-${col}`}
                    >
                      {renderCellContent(row[col])}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
