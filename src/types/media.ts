export type MediaCategory = 'image' | 'table';

export interface ImageItem {
  id: string;
  shortCode: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
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
  createdAt: string;
  folderId?: string | null;
  // Local fallback/preview support
  demoRows?: Record<string, any>[];
  isDemo?: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  type: MediaCategory;
  color?: string;
  itemCount?: number;
  createdAt: string;
}
