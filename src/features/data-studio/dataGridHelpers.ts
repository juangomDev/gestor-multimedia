import type React from 'react';
import type { TableCellStyle } from '../../types/api';

/**
 * Grupo de cabecera contigua tras colapsar etiquetas idénticas en `headers` multinivel.
 */
export interface HeaderGroupCell {
  label: string;
  span: number;
}

/**
 * Agrupa cabeceras consecutivas idénticas en una fila multinivel (`headers[i]`)
 * para renderizar `colSpan` editoriales.
 */
export function groupHeaderRow(headerRow: string[], targetLength: number): HeaderGroupCell[] {
  const normalized = Array.from({ length: targetLength }, (_, i) => headerRow[i] ?? '');
  const groups: HeaderGroupCell[] = [];

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
 * Resuelve estilos dinámicos provenientes del backend (`cellStyles`) para una celda concreta.
 * Soporta tanto el formato anidado `{ [rowIdx]: { [col]: style } }` como claves planas `row:col`.
 */
export function resolveCellInlineStyle(
  cellStyles: Record<string, Record<string, TableCellStyle> | TableCellStyle> | undefined,
  rowIdx: number,
  colName: string,
  colIdx: number
): React.CSSProperties | undefined {
  if (!cellStyles) return undefined;

  let rawStyle: TableCellStyle | undefined;
  const rowBucket = cellStyles[String(rowIdx)];
  if (
    rowBucket &&
    typeof rowBucket === 'object' &&
    !('bold' in rowBucket) &&
    !('bg' in rowBucket) &&
    !('backgroundColor' in rowBucket) &&
    !('align' in rowBucket)
  ) {
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
  if (rawStyle.color) css.color = rawStyle.color;
  if (rawStyle.bold) css.fontWeight = 700;
  if (rawStyle.italic) css.fontStyle = 'italic';
  if (rawStyle.align) css.textAlign = rawStyle.align;

  return Object.keys(css).length > 0 ? css : undefined;
}

/**
 * Clasifica valores textuales conocidos en un tono semántico del sistema de diseño.
 */
export function classifySemanticStatus(value: unknown): 'ok' | 'warn' | 'danger' | null {
  if (typeof value !== 'string') return null;
  const upper = value.trim().toUpperCase();
  if (upper === 'ACTIVE' || upper === 'VALID' || upper === 'COMPLETADO' || upper === 'SUCCESS') {
    return 'ok';
  }
  if (upper === 'PENDING' || upper === 'NEW' || upper === 'EN_PROGRESO' || upper === 'OBSERVACION') {
    return 'warn';
  }
  if (upper === 'FAILED' || upper === 'INVALID' || upper === 'ERROR' || upper === 'INACTIVE') {
    return 'danger';
  }
  return null;
}

/**
 * Filtra y ordena localmente las filas de la página activa del dataset.
 */
export function filterAndSortRows(
  rows: Record<string, unknown>[],
  columns: string[],
  searchTerm: string,
  sortCol: string | null,
  sortDir: 'asc' | 'desc'
): Record<string, unknown>[] {
  const needle = searchTerm.trim().toLowerCase();
  const filtered = needle
    ? rows.filter((row) =>
        columns.some((col) => {
          const val = row[col];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(needle);
        })
      )
    : rows;

  if (!sortCol) return filtered;

  return [...filtered].sort((a, b) => {
    const av = a[sortCol];
    const bv = b[sortCol];
    if (av === bv) return 0;
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;

    const aNum = Number(av);
    const bNum = Number(bv);
    const cmp =
      !Number.isNaN(aNum) && !Number.isNaN(bNum) && String(av).trim() !== '' && String(bv).trim() !== ''
        ? aNum - bNum
        : String(av).localeCompare(String(bv), 'es', { numeric: true, sensitivity: 'base' });
    return sortDir === 'asc' ? cmp : -cmp;
  });
}
