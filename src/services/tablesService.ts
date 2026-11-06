import { apiClient } from './apiClient';
import { storageService } from './storageService';
import { buildPublicAssetUrl } from '../utils/formatters';
import type { TableItem } from '../types/media';
import type { PaginatedTableResponse, MetadataCard, TableCellStyle } from '../types/api';

/**
 * Opciones de paginación y filtrado server-side para listar datasets tabulares.
 */
export interface FetchTablesOptions {
  page?: number;
  limit?: number;
  folderId?: string | null;
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
 * Representación cruda de un registro de tabla en `monolith-backend`.
 */
interface RawApiTable {
  id: string;
  shortCode: string;
  url?: string;
  urlWithVersion?: string;
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
 * Servicio de gestión de datasets tabulares conectado a `monolith-backend`
 * (ingesta CSV/XLSX, formato rico `headers`/`merges`/`cellStyles`, Ficha Técnica `metadataCard` y paginación).
 */
export class TablesService {
  private lastPaginationMeta: TablesPaginationMeta | null = null;

  /**
   * Sube una hoja de cálculo CSV o Excel (`POST /api/v1/tables`) y sincroniza el almacenamiento local.
   */
  async uploadTable(file: File, folderId?: string | null): Promise<TableItem> {
    const isTable =
      file.type === 'text/csv' ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel') ||
      /\.(csv|xlsx|xls)$/i.test(file.name);

    if (!isTable) {
      throw new Error(`El archivo '${file.name}' no es una hoja de cálculo válida (.csv o .xlsx)`);
    }

    const formData = new FormData();
    if (folderId && !folderId.startsWith('fld-')) {
      formData.append('folderId', folderId);
    }
    formData.append('file', file);

    const res = await apiClient.post<RawApiTable>('/api/v1/tables', formData);

    const base = storageService.getConfig().baseUrl;
    const rawCols = res.columns || res.columnsSchema || [];
    const normalizedCols = rawCols.map((c) => (typeof c === 'string' ? c : c.name || String(c)));

    const item: TableItem = {
      id: res.id,
      shortCode: res.shortCode,
      tableName: res.tableName || file.name,
      rowCount: res.rowCount ?? 0,
      columns: normalizedCols,
      sizeBytes: res.sizeBytes ?? file.size,
      url: buildPublicAssetUrl(base, 't', res.shortCode),
      urlWithVersion: res.urlWithVersion,
      metadataCard: res.metadataCard ?? null,
      createdAt: res.createdAt || new Date().toISOString(),
      updatedAt: res.updatedAt,
      folderId: res.folderId !== undefined ? res.folderId : folderId || null,
    };

    storageService.addTable(item);
    return item;
  }

  /**
   * Consulta registros paginados y metadatos de formato rico (`headers`, `merges`, `cellStyles`)
   * de un dataset público (`GET /t/:short_code?page=&limit=`).
   */
  async getTableData(
    shortCode: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedTableResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(500, Math.max(1, limit));

    const res = await apiClient.get<any>(`/t/${shortCode}?page=${safePage}&limit=${safeLimit}`, {
      skipAuth: true,
    });

    const rawRows = res.data || res.rows || (Array.isArray(res) ? res : []);
    const total = res.meta?.total ?? res.totalRows ?? res.rowCount ?? rawRows.length;
    const totalPages = res.meta?.totalPages ?? (Math.ceil(total / safeLimit) || 1);

    const response: PaginatedTableResponse = {
      data: rawRows,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: res.meta?.hasNext ?? safePage < totalPages,
      },
    };

    if (res.id !== undefined) response.id = res.id;
    if (res.shortCode !== undefined) response.shortCode = res.shortCode;
    if (res.tableName !== undefined) response.tableName = res.tableName;
    if (Array.isArray(res.columns)) response.columns = res.columns;
    if (Array.isArray(res.headers)) response.headers = res.headers;
    if (Array.isArray(res.merges)) response.merges = res.merges;
    if (res.cellStyles && typeof res.cellStyles === 'object') {
      response.cellStyles = res.cellStyles as Record<
        string,
        Record<string, TableCellStyle> | TableCellStyle
      >;
    }
    if (res.metadataCard !== undefined) {
      response.metadataCard = res.metadataCard;
    }

    return response;
  }

  /**
   * Alias enriquecido de `getTableData` que extrae y normaliza `headers` multinivel,
   * celdas combinadas (`merges`) y estilos por celda (`cellStyles`) para el Data Studio.
   */
  async fetchTableDetails(
    shortCode: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedTableResponse> {
    const res = await this.getTableData(shortCode, page, limit);
    return {
      ...res,
      headers: res.headers || (res.columns ? [res.columns] : []),
      merges: res.merges || [],
      cellStyles: res.cellStyles || {},
    };
  }

  /**
   * Actualiza la Ficha Técnica (`metadataCard`) de un dataset en PostgreSQL (`PATCH /api/v1/tables/:id/metadata`)
   * y sincroniza el estado en almacenamiento local.
   */
  async updateTableMetadata(id: string, metadata: MetadataCard): Promise<TableItem> {
    const res = await apiClient.patch<{
      id: string;
      shortCode?: string;
      metadataCard: MetadataCard;
    }>(`/api/v1/tables/${id}/metadata`, metadata);

    const current = storageService.getTables();
    const existing = current.find((t) => t.id === id);
    const base = storageService.getConfig().baseUrl;
    const shortCode = res?.shortCode || existing?.shortCode || id;

    const updated: TableItem = {
      ...(existing || {
        id,
        shortCode,
        tableName: `${shortCode}.csv`,
        rowCount: 0,
        sizeBytes: 0,
        url: buildPublicAssetUrl(base, 't', shortCode),
        createdAt: new Date().toISOString(),
      }),
      id: res?.id || id,
      shortCode,
      metadataCard: res?.metadataCard || metadata,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      storageService.saveTables(current.map((t) => (t.id === id ? updated : t)));
    } else {
      storageService.addTable(updated);
    }

    return updated;
  }

  /**
   * Genera la URL de descarga directa de alta fidelidad (`/t/:short_code?download=true`).
   */
  getDownloadUrl(shortCode: string): string {
    const base = storageService.getConfig().baseUrl;
    return `${buildPublicAssetUrl(base, 't', shortCode)}?download=true`;
  }

  /**
   * Elimina un dataset del servidor (`DELETE /api/v1/tables/:id`) y del almacenamiento local.
   */
  async deleteTable(id: string, shortCode?: string): Promise<void> {
    await apiClient.delete(`/api/v1/tables/${id}`);
    storageService.removeTable(id);
    if (shortCode) {
      storageService.removeTable(shortCode);
    }
  }

  /**
   * Obtiene los datasets almacenados localmente, opcionalmente filtrados por carpeta.
   */
  getTables(folderId?: string | null): TableItem[] {
    const all = storageService.getTables();
    if (folderId === undefined) return all;
    return all.filter((t) => (folderId ? t.folderId === folderId : !t.folderId));
  }

  /**
   * Devuelve los metadatos de paginación de la última consulta remota.
   */
  getLastPaginationMeta(): TablesPaginationMeta | null {
    return this.lastPaginationMeta;
  }

  /**
   * Sincroniza la lista de tablas desde el backend (`GET /api/v1/tables`),
   * soportando paginación server-side (`page`, `limit`) y filtro por `folderId`.
   */
  async fetchRemoteTables(options?: FetchTablesOptions): Promise<TableItem[]> {
    try {
      const params = new URLSearchParams();
      if (options?.page !== undefined) params.set('page', String(options.page));
      if (options?.limit !== undefined) params.set('limit', String(options.limit));
      if (options?.folderId) params.set('folderId', options.folderId);

      const qs = params.toString();
      const res = await apiClient.get<{
        tables: RawApiTable[]; total?: number; page?: number; limit?: number; totalPages?: number;
      }>(qs ? `/api/v1/tables?${qs}` : '/api/v1/tables');

      const base = storageService.getConfig().baseUrl;
      const items: TableItem[] = (res.tables || []).map((t) => {
        const rawCols = t.columns || t.columnsSchema || [];
        return {
          id: t.id,
          shortCode: t.shortCode,
          tableName: t.tableName,
          rowCount: t.rowCount ?? 0,
          columns: rawCols.map((c) => (typeof c === 'string' ? c : c.name || String(c))),
          sizeBytes: t.sizeBytes,
          url: buildPublicAssetUrl(base, 't', t.shortCode),
          urlWithVersion: t.urlWithVersion,
          metadataCard: t.metadataCard ?? null,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt,
          folderId: t.folderId || null,
        };
      });

      const total = res.total ?? items.length;
      const page = res.page ?? options?.page ?? 1;
      const limit = res.limit ?? options?.limit ?? Math.max(items.length, 50);
      const totalPages = res.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));
      this.lastPaginationMeta = { total, page, limit, totalPages };

      if (options?.folderId || (options?.page && options.page > 1)) {
        const fetchedIds = new Set(items.map((t) => t.id));
        const others = storageService.getTables().filter((t) => !fetchedIds.has(t.id));
        storageService.saveTables([...items, ...others]);
      } else {
        storageService.saveTables(items);
      }
      return items;
    } catch (err: any) {
      if (storageService.getToken()) {
        console.warn('No se pudo sincronizar tablas remotas:', err?.message || err);
      }
      return storageService.getTables();
    }
  }
}

export const tablesService = new TablesService();
