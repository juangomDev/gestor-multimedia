import { apiClient } from './apiClient';
import { storageService } from './storageService';
import { buildPublicAssetUrl } from '../utils/formatters';
import type { TableItem } from '../types/media';
import type { PaginatedTableResponse } from '../types/api';

export class TablesService {
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
    formData.append('file', file);
    if (folderId) {
      formData.append('folderId', folderId);
    }

    const res = await apiClient.post<{
      id: string;
      shortCode: string;
      url?: string;
      tableName: string;
      rowCount?: number;
      columns?: Array<string | { name: string }>;
      columnsSchema?: Array<string | { name: string }>;
      sizeBytes: number;
      createdAt?: string;
    }>('/api/v1/tables', formData);

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
      createdAt: res.createdAt || new Date().toISOString(),
      folderId: folderId || null,
    };

    storageService.addTable(item);
    return item;
  }

  async getTableData(shortCode: string, page: number = 1, limit: number = 50): Promise<PaginatedTableResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(500, Math.max(1, limit));

    const res = await apiClient.get<any>(`/t/${shortCode}?page=${safePage}&limit=${safeLimit}`, {
      skipAuth: true,
    });

    const rawRows = res.data || res.rows || (Array.isArray(res) ? res : []);
    const total = res.meta?.total ?? res.totalRows ?? res.rowCount ?? rawRows.length;
    const totalPages = res.meta?.totalPages ?? (Math.ceil(total / safeLimit) || 1);

    return {
      data: rawRows,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: res.meta?.hasNext ?? safePage < totalPages,
      },
    };
  }

  getDownloadUrl(shortCode: string): string {
    const base = storageService.getConfig().baseUrl;
    return `${buildPublicAssetUrl(base, 't', shortCode)}?download=true`;
  }

  async deleteTable(id: string, shortCode?: string): Promise<void> {
    await apiClient.delete(`/api/v1/tables/${id}`);
    storageService.removeTable(id);
    if (shortCode) {
      storageService.removeTable(shortCode);
    }
  }

  getTables(folderId?: string | null): TableItem[] {
    const all = storageService.getTables();
    if (folderId === undefined) return all;
    return all.filter((t) => (folderId ? t.folderId === folderId : !t.folderId));
  }

  async fetchRemoteTables(): Promise<TableItem[]> {
    try {
      const res = await apiClient.get<{
        tables: Array<{
          id: string;
          shortCode: string;
          url?: string;
          tableName: string;
          rowCount?: number;
          columns?: Array<string | { name: string }>;
          columnsSchema?: Array<string | { name: string }>;
          sizeBytes: number;
          createdAt: string;
          folderId?: string | null;
        }>;
        total: number;
      }>('/api/v1/tables');

      const base = storageService.getConfig().baseUrl;
      const items: TableItem[] = (res.tables || []).map((t) => {
        const rawCols = t.columns || t.columnsSchema || [];
        const normalizedCols = rawCols.map((c) => (typeof c === 'string' ? c : c.name || String(c)));
        return {
          id: t.id,
          shortCode: t.shortCode,
          tableName: t.tableName,
          rowCount: t.rowCount ?? 0,
          columns: normalizedCols,
          sizeBytes: t.sizeBytes,
          url: buildPublicAssetUrl(base, 't', t.shortCode),
          createdAt: t.createdAt,
          folderId: t.folderId || null,
        };
      });

      // La base de datos es la fuente de verdad: sincronizamos el almacenamiento local
      storageService.saveTables(items);
      return items;
    } catch (err: any) {
      console.warn('No se pudo sincronizar tablas remotas:', err?.message || err);
      return storageService.getTables();
    }
  }
}

export const tablesService = new TablesService();
