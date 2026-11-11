import type { ApiImage, ApiTable, ApiFolder, MetadataCard } from './api';

/**
 * Categoría de activo multimedia gestionado en la plataforma.
 */
export type MediaCategory = 'image' | 'table' | 'pdf';

/**
 * Tipo de carpeta soportado en la jerarquía de 3 niveles (`CONTAINER` en Nivel 1, o especializada en Niveles 2 y 3).
 */
export type FolderCategory = MediaCategory | 'container';

/**
 * Representación de una imagen en el catálogo frontend, extendiendo el contrato OpenAPI (`ApiImage`).
 */
export interface ImageItem extends Partial<Omit<ApiImage, 'id' | 'shortCode' | 'originalName' | 'mimeType' | 'sizeBytes' | 'url' | 'createdAt'>> {
  id: string;
  shortCode: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  urlWithVersion?: string;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  updatedAt?: string;
  folderId?: string | null;
  /** URL de previsualización local o modo demo. */
  demoPreviewUrl?: string;
  /** Indicador de elemento de demostración local. */
  isDemo?: boolean;
}

/**
 * Representación de un dataset/tabla en el catálogo frontend, extendiendo el contrato OpenAPI (`ApiTable`).
 */
export interface TableItem extends Partial<Omit<ApiTable, 'id' | 'shortCode' | 'tableName' | 'rowCount' | 'sizeBytes' | 'url' | 'createdAt' | 'columnsSchema' | 'metadataCard'>> {
  id: string;
  shortCode: string;
  tableName: string;
  rowCount: number;
  columns?: string[];
  sizeBytes: number;
  url: string;
  urlWithVersion?: string;
  /** Ficha técnica semántica del dataset tipada según OpenAPI 3.1. */
  metadataCard?: MetadataCard | Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
  folderId?: string | null;
  /** Filas de respaldo para previsualización offline o modo demo. */
  demoRows?: Record<string, any>[];
  /** Indicador de dataset de demostración local. */
  isDemo?: boolean;
}

/**
 * Representación de una carpeta o proyecto en el frontend, conectada al contrato OpenAPI (`ApiFolder`).
 */
export interface FolderItem extends Partial<Omit<ApiFolder, 'id' | 'name' | 'type' | 'createdAt' | 'myPermission'>> {
  id: string;
  name: string;
  type: FolderCategory;
  parentId?: string | null;
  isSystem?: boolean;
  color?: string | null;
  isPrivate?: boolean;
  itemCount?: number;
  userId?: string;
  owner?: {
    id?: string;
    username?: string;
  };
  myPermission?: 'ADMIN' | 'READ' | 'EDIT';
  isShared?: boolean;
  createdAt: string;
}

/**
 * Reporte de ejecución devuelto por operaciones masivas en lote (`/bulk-delete` y `/bulk-move`).
 */
export interface BulkActionReport {
  /** Cantidad total de identificadores solicitados en la operación. */
  totalRequested: number;
  /** Identificadores de activos procesados exitosamente. */
  successful: string[];
  /** Detalles de fallos individuales con el motivo del rechazo. */
  failed: Array<{
    id: string;
    reason: string;
  }>;
}

/**
 * Ficha técnica enriquecida para documentos PDF.
 */
export interface PdfMetadataCard {
  category?: string;
  summary?: string;
  keywords?: string[];
  custom?: Record<string, unknown>;
}

/**
 * Representación de un documento PDF en el catálogo frontend.
 */
export interface PdfItem {
  id: string;
  shortCode: string;
  originalName: string;
  sizeBytes: number;
  pageCount: number;
  isScanned?: boolean;
  folderId?: string | null;
  userId?: string | null;
  metadataCard?: PdfMetadataCard | null;
  createdAt: string;
  updatedAt?: string;
  url: string;
  urlWithVersion?: string;
}

/**
 * Alias de compatibilidad canónico para registros de PDF.
 */
export type PdfRegistry = PdfItem;

