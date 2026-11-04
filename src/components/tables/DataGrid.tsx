import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import styles from '../../views/TableDataStudioView.module.css';

/**
 * Propiedades del componente de grilla de datos tabulares de alta densidad.
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
 * Grilla de datos de alta densidad con cabeceras fijas (sticky headers) y ordenamiento por columna.
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
}) => {
  return (
    <div className={styles.gridContainer}>
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
                {columns.map((col) => (
                  <td key={col} className={styles.td}>
                    {renderCellContent(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

