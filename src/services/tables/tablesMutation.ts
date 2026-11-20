import { apiClient } from '../apiClient';
import { storageService } from '../storageService';
import { buildPublicAssetUrl, buildVersionedAssetUrl } from '../../utils/formatters';
import type { TableItem } from '../../types/media';
import type { MetadataCard } from '../../types/api';

/**
 * Extensiones soportadas por `monolith-backend` Fase 21 para tablas y datasets.
 */
export const ACCEPTED_TABLE_EXTENSIONS = '.csv,.xlsx,.xls,.json';

/**
 * Representación cruda de un registro de tabla devuelto por `monolith-backend`.
 */
export interface RawApiTable {
  id: string;
  shortCode: string;
  url?: string;
  urlWithVersion?: string;
  downloadUrl?: string;
  tableName: string;
  rowCount?: number;
  columns?: Array<string | { name: string }>;
  columnsSchema?: Array<string | { name: string }>;
  metadataCard?: MetadataCard | Record<string, unknown> | null;
  sizeBytes: number;
  createdAt?: string;
  updatedAt?: string;
  folderId?: string | null;
}

/**
 * Valida si un archivo es un dataset tabular soportado (`.csv`, `.xlsx`, `.xls` o `.json` — Fase 21).
 *
 * @param file Archivo seleccionado por el usuario.
 * @returns `true` cuando el MIME o la extensión son válidos para `/api/v1/tables`.
 */
export function isSupportedTableFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  return (
    mime === 'text/csv' ||
    mime === 'application/json' ||
    mime === 'text/json' ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    /\.(csv|xlsx|xls|json)$/i.test(file.name)
  );
}

/**
 * Normaliza las columnas provenientes del backend hacia un arreglo simple de cadenas.
 *
 * @param raw Arreglo mixto de cadenas u objetos `{ name }`.
 * @returns Arreglo de nombres de columna normalizados.
 */
export function normalizeTableColumns(raw?: Array<string | { name: string }>): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((c) => (typeof c === 'string' ? c : c?.name || String(c)));
}

/**
 * Normaliza una respuesta cruda de tabla proveniente de `monolith-backend` hacia `TableItem`.
 *
 * @param raw Datos crudos devueltos por la API.
 * @param baseUrl URL base activa del backend.
 * @param fallback Valores de respaldo cuando el endpoint devuelve actualización parcial.
 * @returns Entidad `TableItem` tipada y normalizada.
 */
export function normalizeTableItem(
  raw: Partial<RawApiTable>,
  baseUrl: string,
  fallback?: { id?: string; tableName?: string; sizeBytes?: number; folderId?: string | null }
): TableItem {
  const id = raw.id || fallback?.id || '';
  const shortCode = raw.shortCode || id;
  const canonicalUrl = buildPublicAssetUrl(baseUrl, 't', shortCode);

  return {
    id,
    shortCode,
    tableName: raw.tableName || fallback?.tableName || shortCode,
    rowCount: raw.rowCount ?? 0,
    columns: normalizeTableColumns(raw.columns || raw.columnsSchema),
    sizeBytes: raw.sizeBytes ?? fallback?.sizeBytes ?? 0,
    url: canonicalUrl,
    urlWithVersion: raw.urlWithVersion
      ? buildVersionedAssetUrl(canonicalUrl, raw.urlWithVersion, raw.updatedAt)
      : undefined,
    metadataCard: raw.metadataCard ?? null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt,
    folderId: raw.folderId !== undefined ? raw.folderId : fallback?.folderId ?? null,
  };
}

/**
 * Ejecuta el renombrado lógico de un dataset en `monolith-backend` (`PATCH /api/v1/tables/:id`).
 *
 * @param id Identificador UUID de la tabla.
 * @param tableName Nuevo nombre para el dataset (ej. `ventas_q4.json`).
 * @returns Dataset tabular actualizado desde el servidor.
 */
export async function executeTableRename(id: string, tableName: string): Promise<TableItem> {
  const cleanName = tableName.trim();
  if (!cleanName) {
    throw new Error('El nombre de la tabla no puede estar vacío');
  }

  const rawRes = await apiClient.patch<Partial<RawApiTable> & { table?: Partial<RawApiTable> }>(
    `/api/v1/tables/${id}`,
    { tableName: cleanName }
  );
  const res = rawRes?.table || rawRes || {};

  return normalizeTableItem(res, storageService.getApiBaseUrl(), {
    id,
    tableName: cleanName,
  });
}

/**
 * Ejecuta el reemplazo en caliente (Hot-Swap) del archivo físico de un dataset (`PUT /api/v1/tables/:id`).
 * Soporta `.csv`, `.xlsx`, `.xls` y `.json` (Fase 21) conservando UUID, `shortCode` y URL pública.
 *
 * @param id Identificador UUID de la tabla a sustituir.
 * @param file Nuevo archivo binario `.csv`, `.xlsx`, `.xls` o `.json`.
 * @returns Dataset tabular actualizado con sus nuevas dimensiones y metadatos.
 */
export async function executeTableHotSwap(id: string, file: File): Promise<TableItem> {
  if (!isSupportedTableFile(file)) {
    throw new Error(
      `El archivo '${file.name}' no tiene una extensión soportada (.csv, .xlsx, .xls, .json)`
    );
  }

  const formData = new FormData();
  formData.append('file', file);

  const rawRes = await apiClient.put<Partial<RawApiTable> & { table?: Partial<RawApiTable> }>(
    `/api/v1/tables/${id}`,
    formData
  );
  const res = rawRes?.table || rawRes || {};
  const normalized = normalizeTableItem(res, storageService.getApiBaseUrl(), {
    id,
    tableName: file.name,
    sizeBytes: file.size,
  });

  return {
    ...normalized,
    updatedAt: normalized.updatedAt || new Date().toISOString(),
  };
}
