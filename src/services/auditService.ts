import { apiClient, type DownloadResult } from './apiClient';

/**
 * Registro individual de evento de auditoría devuelto por `monolith-backend`.
 */
export interface AuditLogItem {
  id: string;
  actorId?: string | null;
  actorUsername: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  folderId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}

/**
 * Filtros compartidos para consulta y exportación del historial de auditoría.
 */
export interface AuditLogFilterOptions {
  /** Filtrar por acción específica (ej. `USER_CREATE`, `TABLE_UPLOAD`). */
  action?: string;
  /** Filtrar por tipo de recurso (`USER`, `FOLDER`, `IMAGE`, `TABLE`, `PDF`, `FORM`, `API_KEY`). */
  resourceType?: string;
  /** Filtrar por carpeta específica. */
  folderId?: string;
  /** Filtrar por UUID del actor. */
  actorId?: string;
  /** Fecha/hora inicial ISO 8601 (inclusive). */
  from?: string;
  /** Fecha/hora final ISO 8601 (inclusive). */
  to?: string;
  /** Búsqueda libre en actorUsername, action, resourceType o resourceId. */
  search?: string;
}

/**
 * Opciones de filtrado y paginación para la consulta del historial de auditoría.
 */
export interface FetchAuditLogsOptions extends AuditLogFilterOptions {
  page?: number;
  limit?: number;
}

/**
 * Respuesta paginada de eventos de auditoría.
 */
export interface AuditLogsResponse {
  logs: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function appendFilterParams(params: URLSearchParams, options?: AuditLogFilterOptions): void {
  if (options?.action) params.set('action', options.action);
  if (options?.resourceType) params.set('resourceType', options.resourceType);
  if (options?.folderId) params.set('folderId', options.folderId);
  if (options?.actorId) params.set('actorId', options.actorId);
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);
  if (options?.search && options.search.trim()) params.set('search', options.search.trim());
}

/**
 * Servicio para consultar y exportar el historial cronológico inmutable de acciones críticas
 * del sistema (`GET /api/v1/audit-logs` y `GET /api/v1/audit-logs/export`) para roles `ADMIN` y `MANAGER`.
 */
export class AuditService {
  /**
   * Consulta eventos de auditoría registrados en PostgreSQL aplicando filtros por acción,
   * tipo de recurso, carpeta, actor, rango de fechas ISO, búsqueda libre y paginación.
   *
   * @param options Parámetros de consulta opcionales.
   * @returns Listado de registros y metadatos de paginación.
   */
  async fetchAuditLogs(options?: FetchAuditLogsOptions): Promise<AuditLogsResponse> {
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    appendFilterParams(params, options);

    const qs = params.toString();
    const endpoint = qs ? `/api/v1/audit-logs?${qs}` : '/api/v1/audit-logs';

    const res = await apiClient.get<{
      logs?: AuditLogItem[];
      items?: AuditLogItem[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    }>(endpoint);

    const logs = res.logs || res.items || [];
    const total = res.total ?? logs.length;
    const page = res.page ?? options?.page ?? 1;
    const limit = res.limit ?? options?.limit ?? Math.max(logs.length, 50);
    const totalPages = res.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));

    return {
      logs,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Descarga con autenticación Bearer el historial filtrado de auditoría en CSV o Excel `.xlsx`
   * (`GET /api/v1/audit-logs/export`).
   *
   * @param format Formato de exportación (`csv` o `xlsx`).
   * @param filters Filtros opcionales aplicados a la exportación.
   * @returns Resultado binario descargado listo para disparar descarga en navegador.
   */
  async downloadExport(
    format: 'csv' | 'xlsx' = 'csv',
    filters?: AuditLogFilterOptions
  ): Promise<DownloadResult> {
    const params = new URLSearchParams();
    params.set('format', format);
    appendFilterParams(params, filters);
    const endpoint = `/api/v1/audit-logs/export?${params.toString()}`;
    return apiClient.download(endpoint, `auditoria.${format}`);
  }
}

export const auditService = new AuditService();

