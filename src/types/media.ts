export type MediaCategory = 'image' | 'table';

export interface ImageItem {
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
  // Local fallback/preview support
  demoPreviewUrl?: string;
  isDemo?: boolean;
}

export interface TableItem {
  id: string;
  shortCode: string;
  tableName: string;
  rowCount: number;
  columns?: string[];
  sizeBytes: number;
  url: string;
  urlWithVersion?: string;
  metadataCard?: any;
  createdAt: string;
  updatedAt?: string;
  folderId?: string | null;
  // Local fallback/preview support
  demoRows?: Record<string, any>[];
  isDemo?: boolean;
}

export interface FolderItem {
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
