import type { ApiImage, ApiTable, ApiFolder, MetadataCard } from './api';

/**
 * Categoría de activo multimedia gestionado en la plataforma.
 */
export type MediaCategory = 'image' | 'table';

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
export interface FolderItem extends Partial<Omit<ApiFolder, 'id' | 'name' | 'type' | 'createdAt'>> {
  id: string;
  name: string;
  type: MediaCategory;
  color?: string | null;
  isPrivate?: boolean;
  itemCount?: number;
  userId?: string;
  myPermission?: 'READ' | 'EDIT';
  createdAt: string;
}
