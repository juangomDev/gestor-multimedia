import { apiClient } from './apiClient';
import { storageService } from './storageService';
import { buildPublicAssetUrl } from '../utils/formatters';
import type { TableItem } from '../types/media';
import type {
  PaginatedTableResponse,
  MetadataCard,
  TableCellStyle,
  TableDataQueryOptions,
} from '../types/api';
import {
  type RawApiTable,
  ACCEPTED_TABLE_EXTENSIONS,
  isSupportedTableFile,
  normalizeTableColumns,
  normalizeTableItem,
  executeTableRename,
  executeTableHotSwap,
} from './tables/tablesMutation';
import { buildTableEndpointUrl } from './tables/tableQueryUrl';

export { ACCEPTED_TABLE_EXTENSIONS, isSupportedTableFile, normalizeTableColumns, buildTableEndpointUrl };

/**
 * Opciones de paginación y filtrado server-side para listar datasets tabulares.
 */
export interface FetchTablesOptions {
  page?: number;
  limit?: number;
  folderId?: string | null;
  search?: string;
}

/**
 * Metadatos de paginación devueltos por `GET /api/v1/tables`.
 */
export interface TablesPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Respuesta estructurada de listado paginado de datasets tabulares.
 */
export interface PaginatedTablesResult {
  items: TableItem[];
  meta: TablesPaginationMeta;
}

/**
 * Servicio HTTP sin estado de gestión de datasets tabulares conectado a `monolith-backend`
 * (ingesta `.csv`, `.xlsx`, `.xls` y `.json` Fase 21, formato rico, Ficha Técnica y paginación).
 */
export class TablesService {
  /**
   * Sube un dataset `.csv`, `.xlsx`, `.xls` o `.json` (`POST /api/v1/tables`).
   *
   * @param file Archivo tabular soportado.
   * @param folderId UUID de carpeta destino de tipo `TABLE`.
   * @returns Registro tabular creado y normalizado.
   */
  async uploadTable(file: File, folderId?: string | null): Promise<TableItem> {
    if (!isSupportedTableFile(file)) {
      throw new Error(
        `El archivo '${file.name}' no es una tabla válida (.csv, .xlsx, .xls o .json)`
      );
    }

    const formData = new FormData();
    if (folderId) {
      formData.append('folderId', folderId);
    }
    formData.append('file', file);

    const rawRes = await apiClient.post<RawApiTable & { table?: RawApiTable }>(
      '/api/v1/tables',
      formData
    );
    const res = rawRes.table || rawRes;
    return normalizeTableItem(res, storageService.getApiBaseUrl(), {
      tableName: file.name,
      sizeBytes: file.size,
      folderId: folderId ?? null,
    });
  }

  /**
   * Renombra un dataset tabular (`PATCH /api/v1/tables/:id`).
   */
  async renameTable(id: string, tableName: string): Promise<TableItem> {
    return executeTableRename(id, tableName);
  }

  /**
   * Sustituye en caliente el archivo de una tabla (`PUT /api/v1/tables/:id`) soportando
   * `.csv`, `.xlsx`, `.xls` y `.json` (Fase 21).
   */
  async hotSwapTable(id: string, file: File): Promise<TableItem> {
    return executeTableHotSwap(id, file);
  }

  /**
   * Consulta registros paginados, filtrados dinámicamente (`?search=`, `?select=`, `?col=val`, `?father=null`)
   * y metadatos de formato rico (`headers`, `merges`, `cellStyles`) de un dataset público (`GET /t/:short_code`).
   */
  async getTableData(
    shortCode: string,
    pageOrOptions: number | TableDataQueryOptions = 1,
    limit: number = 50,
    extraOptions?: Omit<TableDataQueryOptions, 'page' | 'limit'>
  ): Promise<PaginatedTableResponse> {
    const resolvedOptions: TableDataQueryOptions =
      typeof pageOrOptions === 'object' && pageOrOptions !== null
        ? pageOrOptions
        : { ...extraOptions, page: pageOrOptions, limit };

    const safePage = Math.max(1, resolvedOptions.page ?? 1);
    const safeLimit = Math.min(500, Math.max(1, resolvedOptions.limit ?? 50));
    const endpoint = buildTableEndpointUrl(shortCode, {
      ...resolvedOptions,
      page: safePage,
      limit: safeLimit,
    });

    const res = await apiClient.get<Record<string, unknown>>(endpoint, { skipAuth: true });

    const rawRows = Array.isArray(res.data)
      ? (res.data as Record<string, unknown>[])
      : Array.isArray(res.rows)
      ? (res.rows as Record<string, unknown>[])
      : Array.isArray(res)
      ? (res as Record<string, unknown>[])
      : [];

    const rawMeta = res.meta as { total?: number; totalPages?: number; hasNext?: boolean } | undefined;
    const total =
      rawMeta?.total ??
      (typeof res.totalRows === 'number' ? res.totalRows : undefined) ??
      (typeof res.rowCount === 'number' ? res.rowCount : undefined) ??
      rawRows.length;
    const totalPages = rawMeta?.totalPages ?? (Math.ceil(total / safeLimit) || 1);

    const response: PaginatedTableResponse = {
      data: rawRows,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: rawMeta?.hasNext ?? safePage < totalPages,
      },
    };

    if (typeof res.id === 'string') response.id = res.id;
    if (typeof res.shortCode === 'string') response.shortCode = res.shortCode;
    if (typeof res.tableName === 'string') response.tableName = res.tableName;
    if (Array.isArray(res.columns)) response.columns = res.columns as string[];
    if (Array.isArray(res.headers)) response.headers = res.headers as string[][];
    if (Array.isArray(res.merges)) response.merges = res.merges as string[];
    if (res.cellStyles && typeof res.cellStyles === 'object') {
      response.cellStyles = res.cellStyles as Record<
        string,
        Record<string, TableCellStyle> | TableCellStyle
      >;
    }
    if (res.metadataCard !== undefined) {
      response.metadataCard = res.metadataCard as MetadataCard | null;
    }

    return response;
  }

  /**
   * Alias enriquecido de `getTableData` que garantiza `headers`, `merges` y `cellStyles` definidos.
   */
  async fetchTableDetails(
    shortCode: string,
    pageOrOptions: number | TableDataQueryOptions = 1,
    limit: number = 50,
    extraOptions?: Omit<TableDataQueryOptions, 'page' | 'limit'>
  ): Promise<PaginatedTableResponse> {
    const res = await this.getTableData(shortCode, pageOrOptions, limit, extraOptions);
    return {
      ...res,
      headers: res.headers || (res.columns ? [res.columns] : []),
      merges: res.merges || [],
      cellStyles: res.cellStyles || {},
    };
  }

  /**
   * Consulta directamente el arreglo plano de filas filtradas (`GET /t/:short_code?...&format=rows`).
   * Ideal para cascadas jerárquicas (`?father=15&format=rows`), raíces (`?father=null&format=rows`)
   * o proyecciones ligeras (`?select=id,name,code&format=rows`).
   */
  async queryTableRows(
    shortCode: string,
    options: Omit<TableDataQueryOptions, 'format'> = {}
  ): Promise<Record<string, unknown>[]> {
    const endpoint = buildTableEndpointUrl(shortCode, { ...options, format: 'rows' });
    const res = await apiClient.get< unknown>(endpoint, { skipAuth: true });
    if (Array.isArray(res)) {
      return res as Record<string, unknown>[];
    }
    const obj = res as { data?: unknown; rows?: unknown } | null;
    if (obj && Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    if (obj && Array.isArray(obj.rows)) return obj.rows as Record<string, unknown>[];
    return [];
  }

  /**
   * Construye la URL pública absoluta de consulta dinámica (`GET /t/:short_code?...`) con los filtros activos.
   */
  getTableQueryUrl(shortCode: string, options: TableDataQueryOptions = {}): string {
    return buildTableEndpointUrl(shortCode, options, storageService.getApiBaseUrl());
  }

  /**
   * Actualiza la Ficha Técnica (`metadataCard`) de un dataset (`PATCH /api/v1/tables/:id/metadata`).
   */
  async updateTableMetadata(id: string, metadata: MetadataCard): Promise<TableItem> {
    const res = await apiClient.patch<
      Partial<RawApiTable> & { table?: Partial<RawApiTable>; metadataCard?: MetadataCard }
    >(`/api/v1/tables/${id}/metadata`, metadata);

    const payload = res?.table || res || {};
    const normalized = normalizeTableItem(payload, storageService.getApiBaseUrl(), { id });
    return {
      ...normalized,
      metadataCard: payload.metadataCard ?? metadata,
      updatedAt: payload.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * Genera la URL de descarga directa de alta fidelidad (`/t/:short_code?download=true`).
   */
  getDownloadUrl(shortCode: string): string {
    return `${buildPublicAssetUrl(storageService.getApiBaseUrl(), 't', shortCode)}?download=true`;
  }

  /**
   * Elimina un dataset del servidor (`DELETE /api/v1/tables/:id`).
   */
  async deleteTable(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/tables/${id}`);
  }

  /**
   * Lista datasets tabulares desde `GET /api/v1/tables` devolviendo items y metadatos de paginación.
   */
  async listTables(options?: FetchTablesOptions): Promise<PaginatedTablesResult> {
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.folderId) params.set('folderId', options.folderId);
    if (options?.search && options.search.trim()) params.set('search', options.search.trim());

    const qs = params.toString();
    const res = await apiClient.get<{
      tables?: RawApiTable[];
      meta?: Partial<TablesPaginationMeta>;
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    }>(qs ? `/api/v1/tables?${qs}` : '/api/v1/tables');

    const baseUrl = storageService.getApiBaseUrl();
    const items = (res.tables || []).map((t) => normalizeTableItem(t, baseUrl));

    const total = res.meta?.total ?? res.total ?? items.length;
    const page = res.meta?.page ?? res.page ?? options?.page ?? 1;
    const limit = res.meta?.limit ?? res.limit ?? options?.limit ?? Math.max(items.length, 50);
    const totalPages =
      res.meta?.totalPages ?? res.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));
    const meta: TablesPaginationMeta = { total, page, limit, totalPages };

    return { items, meta };
  }
}

/** Instancia singleton del servicio de datasets tabulares. */
export const tablesService = new TablesService();
