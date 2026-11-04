import type { paths } from './api.generated';

export type ApiPaths = paths;

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

// --- Tipos Canónicos Derivados de OpenAPI 3.1 ---

// Carpetas
export type ApiFolder = NonNullable<paths['/api/v1/folders']['get']['responses'][200]['content']['application/json']['folders']>[number];
export type ApiFolderListResponse = paths['/api/v1/folders']['get']['responses'][200]['content']['application/json'];
export type ApiCreateFolderInput = NonNullable<paths['/api/v1/folders']['post']['requestBody']>['content']['application/json'];
export type ApiUpdateFolderInput = NonNullable<paths['/api/v1/folders/{id}']['patch']['requestBody']>['content']['application/json'];
export type ApiFolderShare = NonNullable<paths['/api/v1/folders/{id}/shares']['get']['responses'][200]['content']['application/json']['shares']>[number];

// Imágenes
export type ApiImage = NonNullable<paths['/api/v1/images']['get']['responses'][200]['content']['application/json']['images']>[number];
export type ApiImageListResponse = paths['/api/v1/images']['get']['responses'][200]['content']['application/json'];

// Tablas y Datasets
export type ApiTable = NonNullable<paths['/api/v1/tables']['get']['responses'][200]['content']['application/json']['tables']>[number];
export type ApiTableListResponse = paths['/api/v1/tables']['get']['responses'][200]['content']['application/json'];
export type ApiTableDataResponse = paths['/t/{short_code}']['get']['responses'][200]['content']['application/json'];
export type ApiUpdateTableMetadataInput = NonNullable<paths['/api/v1/tables/{id}/metadata']['patch']['requestBody']>['content']['application/json'];

// Usuarios y Sesión
export type ApiUser = NonNullable<paths['/api/v1/users']['get']['responses'][200]['content']['application/json']['users']>[number];
export type ApiCreateUserInput = NonNullable<paths['/api/v1/users']['post']['requestBody']>['content']['application/json'];
export type ApiUserProfile = paths['/api/v1/auth/me']['get']['responses'][200]['content']['application/json']['user'];

// Chat y Asistente RAG Tabular
export type ApiChatAnswer = paths['/api/v1/chat/ask']['post']['responses'][200]['content']['application/json'];
export type ApiChatAskInput = NonNullable<paths['/api/v1/chat/ask']['post']['requestBody']>['content']['application/json'];
export type ApiChatSuggestionsResponse = paths['/api/v1/public/chat/suggestions']['get']['responses'][200]['content']['application/json'];

// Estándar de Error RFC 7807 (Problem Details)
export interface ApiProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  instance?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}
