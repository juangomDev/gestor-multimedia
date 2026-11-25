import type { FolderCategory, MediaCategory } from '../types/media';
import type { TableDataQueryOptions } from '../types/api';
import type { FetchImagesOptions } from '../services/imagesService';
import type { FetchTablesOptions } from '../services/tablesService';
import { hasActiveTableQueryFilters } from '../services/tables/tableQueryUrl';
import type { FetchPdfsOptions } from '../services/pdfsService';
import type { FetchFormsOptions, ListEntriesOptions } from '../types/forms';
import type { FetchNotificationsParams } from '../services/notificationsService';
import type { FetchAuditLogsOptions } from '../services/auditService';

/**
 * Parámetros tipados para consultar listados filtrados de carpetas (`GET /api/v1/folders`).
 */
export interface FolderListQueryParams {
  type?: 'CONTAINER' | 'IMAGE' | 'TABLE' | 'PDF' | FolderCategory | MediaCategory;
  search?: string;
  page?: number;
  limit?: number;
  parentId?: string | null;
}

/**
 * Claves jerárquicas tipadas de TanStack Query para todos los dominios de `monolith-backend`.
 * Centraliza el prefijo de cada colección para invalidaciones precisas sin colisiones.
 */
export const queryKeys = {
  folders: {
    all: ['folders'] as const,
    list: (params: FolderListQueryParams = {}) => ['folders', 'list', params] as const,
    tree: () => ['folders', 'tree'] as const,
    detail: (folderId: string) => ['folders', 'detail', folderId] as const,
    shares: (folderId: string) => ['folders', 'shares', folderId] as const,
  },
  images: {
    all: ['images'] as const,
    list: (options: FetchImagesOptions = {}) => ['images', 'list', options] as const,
  },
  tables: {
    all: ['tables'] as const,
    list: (options: FetchTablesOptions = {}) => ['tables', 'list', options] as const,
    data: (
      shortCode: string,
      page: number = 1,
      limit: number = 50,
      filterOptions?: Omit<TableDataQueryOptions, 'page' | 'limit'>
    ) =>
      hasActiveTableQueryFilters(filterOptions)
        ? (['tables', 'data', shortCode, page, limit, filterOptions] as const)
        : (['tables', 'data', shortCode, page, limit] as const),
  },
  pdfs: {
    all: ['pdfs'] as const,
    list: (options: FetchPdfsOptions = {}) => ['pdfs', 'list', options] as const,
    extractedText: (shortCode: string, page?: number) =>
      ['pdfs', 'extractedText', shortCode, page ?? 'all'] as const,
  },
  forms: {
    all: ['forms'] as const,
    list: (options: FetchFormsOptions = {}) => ['forms', 'list', options] as const,
    detail: (idOrSlug: string) => ['forms', 'detail', idOrSlug] as const,
    entries: (formId: string, options: ListEntriesOptions = {}) =>
      ['forms', 'entries', formId, options] as const,
    subscription: (formId: string) => ['forms', 'subscription', formId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (params: FetchNotificationsParams = {}) => ['notifications', 'list', params] as const,
    unreadCount: () => ['notifications', 'unreadCount'] as const,
  },
  chat: {
    all: ['chat'] as const,
    internalSuggestions: (folderId?: string | null) =>
      ['chat', 'internalSuggestions', folderId ?? 'all'] as const,
    suggestions: (folderId?: string | null) => ['chat', 'suggestions', folderId ?? 'all'] as const,
  },
  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const,
  },
  auditLogs: {
    all: ['auditLogs'] as const,
    list: (options: FetchAuditLogsOptions = {}) => ['auditLogs', 'list', options] as const,
  },
  apiKeys: {
    all: ['apiKeys'] as const,
    list: () => ['apiKeys', 'list'] as const,
  },
  storageStats: {
    all: ['storageStats'] as const,
    summary: () => ['storageStats', 'summary'] as const,
  },
  health: {
    all: ['health'] as const,
    status: () => ['health', 'status'] as const,
  },
} as const;
