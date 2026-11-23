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
 * Configuración detectada para navegación jerárquica Padre/Hijo (`?father=<id>` / `?father=null`).
 */
export interface FatherHierarchyConfig {
  /** Nombre real de la columna padre en las filas (ej. `father`). */
  fatherColumn: string;
  /** Alias opcional configurado en `columnsMeta` (ej. `father_id`). */
  fatherAlias?: string;
  /** Columna identificadora del registro padre (ej. `id`). */
  idColumn: string;
  /** Columna descriptiva para mostrar en el breadcrumb (ej. `name` o `nombre`). */
  labelColumn: string;
}

/**
 * Paso dentro del breadcrumb de drill-down jerárquico Padre/Hijo.
 */
export interface HierarchyCrumb {
  idValue: string;
  label: string;
}

/**
 * Detecta si un dataset posee estructura jerárquica Padre/Hijo (`father` / `father_id`)
 * inspeccionando tanto las columnas reales como los alias de `columnsMeta`.
 */
export function resolveFatherHierarchyConfig(
  columns: string[],
  columnsMeta?: Record<string, string>
): FatherHierarchyConfig | null {
  if (columns.length === 0) return null;

  const directFather = columns.find((col) =>
    /^(father|father_id|parent|parent_id)$/i.test(col.trim())
  );

  let fatherColumn = directFather || '';
  let fatherAlias: string | undefined;

  if (columnsMeta) {
    for (const [col, metaVal] of Object.entries(columnsMeta)) {
      const cleanVal = (metaVal || '').trim();
      if (!fatherColumn && /^(father|father_id|parent|parent_id)$/i.test(cleanVal)) {
        fatherColumn = col;
      }
      if (col === fatherColumn && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleanVal) && cleanVal !== col) {
        fatherAlias = cleanVal;
      }
    }
  }

  if (!fatherColumn) return null;

  const idColumn =
    columns.find((col) => /^(id|code|codigo|cod)$/i.test(col.trim())) || columns[0];
  const labelColumn =
    columns.find((col) => /^(name|nombre|title|titulo|estado|municipio|parroquia)$/i.test(col.trim())) ||
    columns.find((col) => col !== idColumn && col !== fatherColumn) ||
    idColumn;

  return { fatherColumn, fatherAlias, idColumn, labelColumn };
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
