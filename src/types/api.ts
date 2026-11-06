import type { paths } from './api.generated';

/**
 * Mapa completo de rutas OpenAPI 3.1 generadas desde monolith-backend.
 */
export type ApiPaths = paths;

/**
 * Respuesta diagnóstica del endpoint GET /health enriquecida con latencia.
 */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  storage: 'writable' | 'unwritable';
  timestamp: string;
  latencyMs?: number;
  /** Alias opcional `database` que algunas versiones del backend devuelven en lugar de `db`. */
  database?: 'up' | 'down';
  /** Segundos que lleva el proceso del backend en ejecución (si el backend lo expone). */
  uptime?: number;
}

/**
 * Metadatos de paginación para consultas tabulares server-side.
 */
export interface TablePaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

/**
 * Estilo visual calculado por el backend para una celda de hoja de cálculo.
 */
export interface TableCellStyle {
  bg?: string;
  backgroundColor?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

/**
 * Estructura paginada devuelta al consultar registros y formato rico de un dataset (/t/:short_code).
 */
export interface PaginatedTableResponse {
  id?: string;
  shortCode?: string;
  tableName?: string;
  columns?: string[];
  headers?: string[][];
  merges?: string[];
  cellStyles?: Record<string, Record<string, TableCellStyle> | TableCellStyle>;
  metadataCard?: MetadataCard | null;
  data: Record<string, any>[];
  meta: TablePaginationMeta;
}

/**
 * Configuración de conectividad del cliente HTTP con monolith-backend.
 */
export interface ClientConfig {
  baseUrl: string;
  apiKey: string;
}

// --- Tipos Canónicos Derivados de OpenAPI 3.1 ---

/** Entidad de carpeta devuelta por GET /api/v1/folders. */
export type ApiFolder = NonNullable<paths['/api/v1/folders']['get']['responses'][200]['content']['application/json']['folders']>[number];
/** Alias canónico de carpeta del contrato OpenAPI. */
export type Folder = ApiFolder;
/** Respuesta de listado paginado de carpetas. */
export type ApiFolderListResponse = paths['/api/v1/folders']['get']['responses'][200]['content']['application/json'];
/** Payload de creación de carpeta (POST /api/v1/folders). */
export type ApiCreateFolderInput = NonNullable<paths['/api/v1/folders']['post']['requestBody']>['content']['application/json'];
/** Payload de actualización parcial de carpeta (PATCH /api/v1/folders/:id). */
export type ApiUpdateFolderInput = NonNullable<paths['/api/v1/folders/{id}']['patch']['requestBody']>['content']['application/json'];
/** Registro de permiso compartido sobre una carpeta. */
export type ApiFolderShare = NonNullable<paths['/api/v1/folders/{id}/shares']['get']['responses'][200]['content']['application/json']['shares']>[number];

/** Entidad de imagen registrada en el backend (GET /api/v1/images). */
export type ApiImage = NonNullable<paths['/api/v1/images']['get']['responses'][200]['content']['application/json']['images']>[number];
/** Alias canónico de registro de imagen del contrato OpenAPI. */
export type ImageRegistry = ApiImage;
/** Respuesta de listado paginado de imágenes. */
export type ApiImageListResponse = paths['/api/v1/images']['get']['responses'][200]['content']['application/json'];

/** Entidad de dataset/tabla registrada en el backend (GET /api/v1/tables). */
export type ApiTable = NonNullable<paths['/api/v1/tables']['get']['responses'][200]['content']['application/json']['tables']>[number];
/** Alias canónico de registro de tabla del contrato OpenAPI. */
export type TableRegistry = ApiTable;
/** Respuesta de listado paginado de tablas. */
export type ApiTableListResponse = paths['/api/v1/tables']['get']['responses'][200]['content']['application/json'];
/** Respuesta de datos y metadatos de una tabla (GET /t/:short_code). */
export type ApiTableDataResponse = paths['/t/{short_code}']['get']['responses'][200]['content']['application/json'];
/** Payload para actualizar la ficha técnica de un dataset (PATCH /api/v1/tables/:id/metadata). */
export type ApiUpdateTableMetadataInput = NonNullable<paths['/api/v1/tables/{id}/metadata']['patch']['requestBody']>['content']['application/json'];
/** Ficha técnica enriquecida (metadataCard) asociada a un dataset tabular. */
export type MetadataCard = ApiUpdateTableMetadataInput;

/** Entidad de usuario devuelta por GET /api/v1/users. */
export type ApiUser = NonNullable<paths['/api/v1/users']['get']['responses'][200]['content']['application/json']['users']>[number];
/** Payload de creación de usuario (POST /api/v1/users). */
export type ApiCreateUserInput = NonNullable<paths['/api/v1/users']['post']['requestBody']>['content']['application/json'];
/** Perfil del usuario autenticado (GET /api/v1/auth/me). */
export type ApiUserProfile = paths['/api/v1/auth/me']['get']['responses'][200]['content']['application/json']['user'];

/** Respuesta analítica del asistente RAG tabular (POST /api/v1/chat/ask). */
export type ApiChatAnswer = paths['/api/v1/chat/ask']['post']['responses'][200]['content']['application/json'];
/** Alias canónico de respuesta del asistente RAG. */
export type ChatAnswer = ApiChatAnswer;
/** Payload de consulta al asistente RAG tabular. */
export type ApiChatAskInput = NonNullable<paths['/api/v1/chat/ask']['post']['requestBody']>['content']['application/json'];
/** Respuesta de sugerencias públicas de preguntas analíticas. */
export type ApiChatSuggestionsResponse = paths['/api/v1/public/chat/suggestions']['get']['responses'][200]['content']['application/json'];

/**
 * Estándar de Error RFC 7807 (Problem Details) devuelto por monolith-backend.
 */
export interface ApiProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  instance?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}
