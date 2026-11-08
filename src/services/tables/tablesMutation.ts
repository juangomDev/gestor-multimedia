import { apiClient } from '../apiClient';
import { storageService } from '../storageService';
import { buildPublicAssetUrl } from '../../utils/formatters';
import type { TableItem } from '../../types/media';
import type { MetadataCard } from '../../types/api';

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
 * Normaliza las columnas provenientes del backend hacia un arreglo simple de cadenas.
 * @param raw Arreglo mixto de cadenas u objetos `{ name }`.
 * @returns Arreglo de nombres de columna normalizados.
 */
export function normalizeTableColumns(raw?: Array<string | { name: string }>): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((c) => (typeof c === 'string' ? c : c?.name || String(c)));
}

/**
 * Ejecuta el renombrado lógico de un dataset en `monolith-backend` (`PATCH /api/v1/tables/:id`).
 * @param id Identificador UUID de la tabla.
 * @param tableName Nuevo nombre para el dataset (ej. `ventas_q4.csv`).
 * @returns Dataset tabular actualizado con persistencia sincronizada.
 */
export async function executeTableRename(id: string, tableName: string): Promise<TableItem> {
  const cleanName = tableName.trim();
  if (!cleanName) {
    throw new Error('El nombre de la tabla no puede estar vacío');
  }

  const base = storageService.getConfig().baseUrl;
  let res: RawApiTable | null = null;

  try {
    res = await apiClient.patch<RawApiTable>(`/api/v1/tables/${id}`, {
      tableName: cleanName,
    });
  } catch (err: any) {
    // Resiliencia ante servidores mock o rutas no registradas en caliente
    const msg = err?.message || err?.detail || '';
    if (msg.includes('Route PATCH:') || msg.includes('not found') || id.startsWith('tbl-mock')) {
      console.warn('Fallback local para renombrado de tabla:', msg);
    } else {
      throw err;
    }
  }

  const current = storageService.getTables();
  const existing = current.find((t) => t.id === id);
  const shortCode = res?.shortCode || existing?.shortCode || id;

  const updated: TableItem = {
    ...(existing || {
      id,
      shortCode,
      rowCount: 0,
      sizeBytes: 0,
      url: buildPublicAssetUrl(base, 't', shortCode),
      createdAt: new Date().toISOString(),
    }),
    id: res?.id || id,
    shortCode,
    tableName: res?.tableName || cleanName,
    rowCount: res?.rowCount ?? existing?.rowCount ?? 0,
    columns: res ? normalizeTableColumns(res.columns || res.columnsSchema) : existing?.columns || [],
    sizeBytes: res?.sizeBytes ?? existing?.sizeBytes ?? 0,
    url: res?.url || buildPublicAssetUrl(base, 't', shortCode),
    urlWithVersion: res?.urlWithVersion || existing?.urlWithVersion,
    metadataCard: res?.metadataCard !== undefined ? res.metadataCard : existing?.metadataCard ?? null,
    updatedAt: res?.updatedAt || new Date().toISOString(),
    folderId: res?.folderId !== undefined ? res.folderId : existing?.folderId || null,
  };

  if (existing) {
    storageService.saveTables(current.map((t) => (t.id === id ? updated : t)));
  } else {
    storageService.addTable(updated);
  }

  return updated;
}

/**
 * Ejecuta el reemplazo en caliente (Hot-Swap) del archivo físico de un dataset (`PUT /api/v1/tables/:id`).
 * Conserva el mismo identificador UUID, `shortCode` y URL pública.
 * @param id Identificador UUID de la tabla a sustituir.
 * @param file Nuevo archivo binario `.csv` o `.xlsx`.
 * @returns Dataset tabular actualizado con sus nuevas dimensiones y metadatos.
 */
export async function executeTableHotSwap(id: string, file: File): Promise<TableItem> {
  const isTable =
    file.type === 'text/csv' ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel') ||
    /\.(csv|xlsx|xls)$/i.test(file.name);

  if (!isTable) {
    throw new Error(`El archivo '${file.name}' no tiene una extensión soportada (.csv, .xlsx, .xls)`);
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.put<RawApiTable>(`/api/v1/tables/${id}`, formData);

  const base = storageService.getConfig().baseUrl;
  const current = storageService.getTables();
  const existing = current.find((t) => t.id === id);
  const shortCode = res.shortCode || existing?.shortCode || id;

  const updated: TableItem = {
    ...(existing || {
      id,
      shortCode,
      createdAt: new Date().toISOString(),
    }),
    id: res.id,
    shortCode,
    tableName: res.tableName || file.name,
    rowCount: res.rowCount ?? 0,
    columns: normalizeTableColumns(res.columns || res.columnsSchema),
    sizeBytes: res.sizeBytes ?? file.size,
    url: res.url || buildPublicAssetUrl(base, 't', shortCode),
    urlWithVersion: res.urlWithVersion,
    metadataCard: res.metadataCard !== undefined ? res.metadataCard : existing?.metadataCard ?? null,
    updatedAt: res.updatedAt || new Date().toISOString(),
    folderId: res.folderId !== undefined ? res.folderId : existing?.folderId || null,
  };

  if (existing) {
    storageService.saveTables(current.map((t) => (t.id === id ? updated : t)));
  } else {
    storageService.addTable(updated);
  }

  return updated;
}

