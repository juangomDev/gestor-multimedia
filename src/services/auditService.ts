import { apiClient } from './apiClient';

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
 * Opciones de filtrado y paginación para la consulta del historial de auditoría.
 */
export interface FetchAuditLogsOptions {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  folderId?: string;
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

/**
 * Servicio para consultar el historial cronológico inmutable de acciones críticas
 * del sistema (`GET /api/v1/audit-logs`) para roles `ADMIN` y `MANAGER`.
 */
export class AuditService {
  /**
   * Consulta eventos de auditoría registrados en PostgreSQL aplicando filtros por acción,
   * tipo de recurso, carpeta y paginación.
   * @param options Parámetros de consulta opcionales.
   * @returns Listado de registros y metadatos de paginación.
   */
  async fetchAuditLogs(options?: FetchAuditLogsOptions): Promise<AuditLogsResponse> {
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.action) params.set('action', options.action);
    if (options?.resourceType) params.set('resourceType', options.resourceType);
    if (options?.folderId) params.set('folderId', options.folderId);

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
}

export const auditService = new AuditService();

