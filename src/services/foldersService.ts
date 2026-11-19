import { apiClient } from './apiClient';
import type {
  ApiFolder,
  ApiFolderListResponse,
  ApiUpdateFolderInput,
  ApiFolderShare,
} from '../types/api';
import type { FolderItem, FolderCategory, MediaCategory } from '../types/media';
import {
  normalizeFolder,
  flattenFolderTree,
  getFolderPathLabel,
  getFolderDepth,
} from './folders/folderHelpers';

export { normalizeFolder, flattenFolderTree, getFolderPathLabel, getFolderDepth };

/**
 * Payload de entrada para crear una carpeta (`POST /api/v1/folders`).
 * Soporta tanto `'CONTAINER' | 'IMAGE' | 'TABLE' | 'PDF'` como `'container' | 'image' | 'table' | 'pdf'`.
 */
export interface CreateFolderPayload {
  name: string;
  type: 'CONTAINER' | 'IMAGE' | 'TABLE' | 'PDF' | FolderCategory;
  parentId?: string | null;
  color?: string;
  isPrivate?: boolean;
}

/**
 * Servicio HTTP sin estado para gestión de carpetas en 3 niveles, permisos RBAC y compartición
 * en PostgreSQL (`monolith-backend`).
 */
export class FoldersService {
  /**
   * Obtiene el listado de carpetas desde PostgreSQL respetando reglas de privacidad (`GET /api/v1/folders`).
   */
  async fetchFolders(
    type?: 'CONTAINER' | 'IMAGE' | 'TABLE' | 'PDF' | FolderCategory | MediaCategory,
    search?: string,
    page?: number,
    limit?: number,
    parentId?: string | null
  ): Promise<FolderItem[]> {
    const params = new URLSearchParams();
    if (type) params.set('type', type.toUpperCase());
    if (search && search.trim()) params.set('search', search.trim());
    if (page !== undefined) params.set('page', String(page));
    if (limit !== undefined) params.set('limit', String(limit));
    if (parentId) params.set('parentId', parentId);

    const qs = params.toString();
    const endpoint = qs ? `/api/v1/folders?${qs}` : '/api/v1/folders';

    const res = await apiClient.get<ApiFolderListResponse>(endpoint);
    return (res.folders || []).map((f) => normalizeFolder(f));
  }

  /**
   * Obtiene el árbol jerárquico completo de hasta 3 niveles (`GET /api/v1/folders/tree`).
   */
  async fetchFolderTree(): Promise<FolderItem[]> {
    const res = await apiClient.get<{
      tree?: Record<string, unknown>[];
      folders?: Record<string, unknown>[];
    }>('/api/v1/folders/tree');
    return (res.tree || res.folders || []).map((node) => normalizeFolder(node));
  }

  /**
   * Obtiene el detalle de una carpeta específica por su UUID (`GET /api/v1/folders/:id`).
   */
  async getFolderById(id: string): Promise<FolderItem> {
    const res = await apiClient.get<{ folder?: ApiFolder } & Partial<ApiFolder>>(
      `/api/v1/folders/${id}`
    );
    return normalizeFolder(res?.folder || res);
  }

  /**
   * Crea una nueva carpeta (`CONTAINER`, `IMAGE`, `TABLE` o `PDF`) en PostgreSQL (`POST /api/v1/folders`).
   */
  async createFolder(payload: CreateFolderPayload): Promise<FolderItem> {
    const rawUpper = payload.type.toUpperCase();
    const apiType: 'CONTAINER' | 'IMAGE' | 'TABLE' | 'PDF' =
      rawUpper === 'CONTAINER'
        ? 'CONTAINER'
        : rawUpper === 'TABLE'
        ? 'TABLE'
        : rawUpper === 'PDF'
        ? 'PDF'
        : 'IMAGE';
    const body: Record<string, unknown> = {
      name: payload.name.trim(),
      type: apiType,
      color: payload.color,
      isPrivate: payload.isPrivate ?? false,
    };
    if (payload.parentId !== undefined) body.parentId = payload.parentId;
    const res = await apiClient.post<{ folder?: ApiFolder } & Partial<ApiFolder>>(
      '/api/v1/folders',
      body
    );
    return normalizeFolder(res?.folder || res);
  }

  /**
   * Actualiza las propiedades de una carpeta existente: nombre, color o privacidad (`PATCH /api/v1/folders/:id`).
   */
  async updateFolder(id: string, payload: ApiUpdateFolderInput): Promise<FolderItem> {
    const res = await apiClient.patch<{ folder?: ApiFolder } & Partial<ApiFolder>>(
      `/api/v1/folders/${id}`,
      payload
    );
    return normalizeFolder(res?.folder || res);
  }

  /**
   * Elimina una carpeta en cascada física y lógica (`DELETE /api/v1/folders/:id`).
   */
  async deleteFolder(id: string): Promise<{ message: string; deletedCount: number }> {
    const res = await apiClient.delete<{ message: string; deletedCount: number }>(
      `/api/v1/folders/${id}`
    );
    return res ?? { message: 'Carpeta eliminada exitosamente', deletedCount: 0 };
  }

  /**
   * Reasigna una imagen a otra carpeta de tipo `IMAGE` en PostgreSQL (`PATCH /api/v1/images/:id/folder`).
   */
  async moveImageToFolder(
    imageId: string,
    folderId: string | null
  ): Promise<{ id?: string; folderId?: string | null }> {
    if (!folderId) {
      throw new Error('Debes indicar una carpeta destino válida para mover la imagen');
    }
    const res = await apiClient.patch<{ image?: { id?: string; folderId?: string } }>(
      `/api/v1/images/${imageId}/folder`,
      { folderId }
    );
    return res?.image || { id: imageId, folderId };
  }

  /**
   * Reasigna una tabla/dataset a otra carpeta de tipo `TABLE` en PostgreSQL (`PATCH /api/v1/tables/:id/folder`).
   */
  async moveTableToFolder(
    tableId: string,
    folderId: string | null
  ): Promise<{ id?: string; folderId?: string | null }> {
    if (!folderId) {
      throw new Error('Debes indicar una carpeta destino válida para mover la tabla');
    }
    const res = await apiClient.patch<{ table?: { id?: string; folderId?: string } }>(
      `/api/v1/tables/${tableId}/folder`,
      { folderId }
    );
    return res?.table || { id: tableId, folderId };
  }

  /**
   * Comparte una carpeta con un colaborador asignándole permiso inicial (`POST /api/v1/folders/:id/shares`).
   */
  async shareFolder(
    folderId: string,
    userId: string,
    permission: 'READ' | 'EDIT' = 'READ'
  ): Promise<ApiFolderShare> {
    const res = await apiClient.post<{ share: ApiFolderShare }>(
      `/api/v1/folders/${folderId}/shares`,
      { userId, permission }
    );
    return res.share;
  }

  /**
   * Lista todos los colaboradores que tienen acceso compartido a una carpeta (`GET /api/v1/folders/:id/shares`).
   */
  async listShares(folderId: string): Promise<ApiFolderShare[]> {
    const res = await apiClient.get<{ shares?: ApiFolderShare[] }>(
      `/api/v1/folders/${folderId}/shares`
    );
    return res.shares || [];
  }

  /**
   * Modifica el permiso (`READ` <-> `EDIT`) de un colaborador en una carpeta (`PATCH /api/v1/folders/:id/shares/:userId`).
   */
  async updateSharePermission(
    folderId: string,
    userId: string,
    permission: 'READ' | 'EDIT'
  ): Promise<ApiFolderShare> {
    const res = await apiClient.patch<{ share: ApiFolderShare }>(
      `/api/v1/folders/${folderId}/shares/${userId}`,
      { permission }
    );
    return res.share;
  }

  /**
   * Revoca y expulsa el acceso de un colaborador sobre una carpeta (`DELETE /api/v1/folders/:id/shares/:userId`).
   */
  async revokeShare(folderId: string, userId: string): Promise<{ revoked: boolean }> {
    const res = await apiClient.delete<{ revoked: boolean }>(
      `/api/v1/folders/${folderId}/shares/${userId}`
    );
    return res ?? { revoked: true };
  }
}

/** Instancia singleton del servicio de carpetas. */
export const foldersService = new FoldersService();
