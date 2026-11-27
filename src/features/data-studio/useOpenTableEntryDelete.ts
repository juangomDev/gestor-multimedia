import { useCallback, useState } from 'react';
import { useFolderOwnerAccess } from '../explorer/useFolderOwnerAccess';
import type { MetadataCard } from '../../types/api';
import type { FormEntryStatus } from '../../types/forms';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMPOSITE_ROW_ID_REGEX =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_\d+$/i;

const IGNORED_SUMMARY_KEYS = new Set([
  'id',
  'entryId',
  'itemIndex',
  'status',
  'createdAt',
  'resolvedAt',
  'updatedAt',
  'dispatchedAt',
]);

/**
 * Datos mínimos de una fila de tabla abierta seleccionada para eliminación vía
 * `DELETE /api/v1/forms/entries/:id`.
 */
export interface OpenTableEntryTarget {
  /** UUID de la entrada (`FormEntry.id`) resuelto desde `row.entryId` o `row.id`. */
  entryId: string;
  /** Estado actual reportado en la fila (`NEW`, `VALID`, `INVALID`) si está proyectado. */
  status: FormEntryStatus | null;
  /** Etiqueta breve construida con los primeros campos legibles de la fila. */
  summaryLabel: string | null;
}

/**
 * Determina si los metadatos de una tabla corresponden a una Tabla Abierta vinculada
 * a un Formulario Dinámico (`metadataCard.tags` incluye `'form'`).
 */
export function isFormOpenTableMetadata(
  metadataCard: MetadataCard | Record<string, unknown> | null | undefined
): boolean {
  const tags = metadataCard && 'tags' in metadataCard ? metadataCard.tags : undefined;
  if (!Array.isArray(tags)) return false;
  return tags.some((tag) => String(tag).trim().toLowerCase() === 'form');
}

/**
 * Extrae el UUID de `FormEntry.id` desde una fila de Tabla Abierta:
 * 1. Prioriza `row.entryId` (tablas maestro-detalle con varias filas por entrada).
 * 2. Usa `row.id` directo cuando es UUID (formularios planos).
 * 3. Recupera el prefijo UUID de `row.id` compuesto (`<uuid>_<itemIndex>`) si `entryId` fue ocultado por `?select=`.
 */
export function extractOpenTableEntryId(row: Record<string, unknown>): string | null {
  const rawEntryId = typeof row.entryId === 'string' ? row.entryId.trim() : '';
  if (rawEntryId && UUID_REGEX.test(rawEntryId)) return rawEntryId;

  const rawId = typeof row.id === 'string' ? row.id.trim() : '';
  if (rawId && UUID_REGEX.test(rawId)) return rawId;

  const compositeMatch = rawId ? COMPOSITE_ROW_ID_REGEX.exec(rawId) : null;
  return compositeMatch ? compositeMatch[1] : null;
}

/**
 * Construye una etiqueta compacta con hasta 2 campos legibles de una fila de tabla abierta
 * para mostrar contexto en el diálogo de confirmación.
 */
export function buildOpenTableRowSummary(row: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (IGNORED_SUMMARY_KEYS.has(key)) continue;
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (!text) continue;
    parts.push(text);
    if (parts.length >= 2) break;
  }
  if (parts.length === 0) return null;
  const combined = parts.join(' · ');
  return combined.length > 72 ? `${combined.slice(0, 69)}...` : combined;
}

/**
 * Parámetros de entrada para `useOpenTableEntryDelete`.
 */
export interface UseOpenTableEntryDeleteParams {
  shortCode: string;
  folderId: string | null | undefined;
  metadataCard: MetadataCard | null;
  allColumns: string[];
}

/**
 * Encapsula la lógica 1:1 de detección de Tabla Abierta de formulario, verificación estricta
 * de permisos de propietario/`ADMIN`, extracción de `entryId` y estado del modal de borrado
 * para `DataStudioPage`.
 */
export function useOpenTableEntryDelete({
  shortCode,
  folderId,
  metadataCard,
  allColumns,
}: UseOpenTableEntryDeleteParams) {
  const [trackedCode, setTrackedCode] = useState(shortCode);
  const [targetEntry, setTargetEntry] = useState<OpenTableEntryTarget | null>(null);

  if (trackedCode !== shortCode) {
    setTrackedCode(shortCode);
    setTargetEntry(null);
  }

  const isOwnerOrAdmin = useFolderOwnerAccess(folderId);
  const isFormOpenTable = isFormOpenTableMetadata(metadataCard);
  const isMasterDetailTable = allColumns.includes('entryId');
  const canDeleteEntries = isFormOpenTable && isOwnerOrAdmin;

  const canDeleteRow = useCallback(
    (row: Record<string, unknown>) =>
      canDeleteEntries && Boolean(extractOpenTableEntryId(row)),
    [canDeleteEntries]
  );

  const openDeleteForRow = useCallback((row: Record<string, unknown>) => {
    const entryId = extractOpenTableEntryId(row);
    if (!entryId) return;
    const rawStatus = typeof row.status === 'string' ? row.status.toUpperCase() : '';
    const status: FormEntryStatus | null =
      rawStatus === 'NEW' || rawStatus === 'VALID' || rawStatus === 'INVALID'
        ? rawStatus
        : null;
    setTargetEntry({
      entryId,
      status,
      summaryLabel: buildOpenTableRowSummary(row),
    });
  }, []);

  const clearTarget = useCallback(() => setTargetEntry(null), []);

  return {
    isFormOpenTable,
    isMasterDetailTable,
    canDeleteEntries,
    canDeleteRow,
    targetEntry,
    openDeleteForRow,
    clearTarget,
  };
}
