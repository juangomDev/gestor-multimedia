export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  storage: 'writable' | 'unwritable';
  timestamp: string;
  latencyMs?: number;
}

export interface TablePaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export interface PaginatedTableResponse {
  data: Record<string, any>[];
  meta: TablePaginationMeta;
}

export interface ClientConfig {
  baseUrl: string;
  apiKey: string;
}
