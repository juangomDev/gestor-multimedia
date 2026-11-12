import { apiClient } from './apiClient';
import { storageService } from './storageService';
import type {
  ApiFolder,
  ApiFolderListResponse,
  ApiUpdateFolderInput,
  ApiFolderShare,
} from '../types/api';
import type { FolderItem, FolderCategory, MediaCategory } from '../types/media';

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
 * Normaliza un registro `ApiFolder` devuelto por PostgreSQL hacia la interfaz `FolderItem` del frontend.
 *
 * @param raw Objeto de carpeta devuelto por `monolith-backend`.
 * @returns Entidad `FolderItem` tipada y normalizada.
 */
export function normalizeFolder(
  raw?: (Omit<Partial<ApiFolder>, 'type'> & {
    id?: string;
    name?: string;
    type?: string;
    parentId?: string | null;
    isSystem?: boolean;
    children?: unknown[];
    isShared?: boolean;
  }) | null
): FolderItem {
  const safe = raw || {};
  const rawType = String(safe.type || 'IMAGE').toUpperCase();
  const normalizedType: FolderCategory =
    rawType === 'CONTAINER'
      ? 'container'
      : rawType === 'TABLE'
      ? 'table'
      : rawType === 'PDF'
      ? 'pdf'
      : 'image';

  const normalizedChildren = Array.isArray(safe.children)
    ? safe.children.map((child) => normalizeFolder(child as Record<string, unknown>))
    : undefined;

  return {
    id: safe.id || `fld-${Date.now()}`,
    name: safe.name || 'General',
    type: normalizedType,
    parentId: safe.parentId ?? null,
    isSystem: safe.isSystem ?? false,
    ...(normalizedChildren ? { children: normalizedChildren } : {}),
    color: safe.color ?? '#3b82f6',
    isPrivate: safe.isPrivate ?? false,
    itemCount: safe.itemCount ?? 0,
    userId: safe.userId,
    owner: safe.owner,
    myPermission: safe.myPermission,
    isShared: safe.isShared,
    createdAt: safe.createdAt || new Date().toISOString(),
  };
}

/**
 * Aplana recursivamente un árbol jerárquico de carpetas conservando `parentId` en cada nodo.
 */
export function flattenFolderTree(nodes: FolderItem[], parentId: string | null = null): FolderItem[] {
  const flat: FolderItem[] = [];
  const seen = new Set<string>();
  const walk = (items: FolderItem[], currentParent: string | null) => {
    for (const node of items) {
      const normalizedNode: FolderItem = { ...node, parentId: node.parentId ?? currentParent };
      if (!seen.has(normalizedNode.id)) {
        seen.add(normalizedNode.id);
        flat.push(normalizedNode);
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children, normalizedNode.id);
      }
    }
  };
  walk(nodes, parentId);
  return flat;
}

/**
 * Construye la ruta legible de hasta 3 niveles (`Padre › Subcarpeta`) para selectores de carpetas.
 */
export function getFolderPathLabel(folder: FolderItem, allFolders: FolderItem[]): string {
  const parts: string[] = [folder.name];
  let curr: FolderItem | undefined = folder;
  const visited = new Set<string>([folder.id]);
  while (curr?.parentId && !visited.has(curr.parentId)) {
    visited.add(curr.parentId);
    const parent = allFolders.find((f) => f.id === curr!.parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    curr = parent;
  }
  return parts.join(' › ');
}

/**
 * Servicio centralizado de gestión de carpetas, permisos RBAC y compartición en PostgreSQL (`monolith-backend`).
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
    const folders = (res.folders || []).map((f) => normalizeFolder(f));
    if (!type && !search && !parentId) storageService.saveFolders(folders);
    return folders;
  }

  /** Obtiene el árbol jerárquico completo de hasta 3 niveles (`GET /api/v1/folders/tree`). */
  async fetchFolderTree(): Promise<FolderItem[]> {
    const res = await apiClient.get<{ tree?: Record<string, unknown>[]; folders?: Record<string, unknown>[] }>('/api/v1/folders/tree');
    return (res.tree || res.folders || []).map((node) => normalizeFolder(node));
  }

  /** Obtiene el detalle de una carpeta específica por su UUID (`GET /api/v1/folders/:id`). */
  async getFolderById(id: string): Promise<FolderItem> {
    const res = await apiClient.get<{ folder?: ApiFolder } & Partial<ApiFolder>>(`/api/v1/folders/${id}`);
    return normalizeFolder(res?.folder || res);
  }

  /** Crea una nueva carpeta (`CONTAINER`, `IMAGE`, `TABLE` o `PDF`) en PostgreSQL (`POST /api/v1/folders`). */
  async createFolder(payload: CreateFolderPayload): Promise<FolderItem> {
    const rawUpper = payload.type.toUpperCase();
    const apiType: 'CONTAINER' | 'IMAGE' | 'TABLE' | 'PDF' =
      rawUpper === 'CONTAINER' ? 'CONTAINER' : rawUpper === 'TABLE' ? 'TABLE' : rawUpper === 'PDF' ? 'PDF' : 'IMAGE';
    const body: Record<string, unknown> = {
      name: payload.name.trim(),
      type: apiType,
      color: payload.color,
      isPrivate: payload.isPrivate ?? false,
    };
    if (payload.parentId !== undefined) body.parentId = payload.parentId;
    const res = await apiClient.post<{ folder?: ApiFolder } & Partial<ApiFolder>>('/api/v1/folders', body);
    const created = normalizeFolder(res?.folder || res);
    storageService.addFolder(created);
    return created;
  }

  /** Actualiza las propiedades de una carpeta existente: nombre, color o privacidad (`PATCH /api/v1/folders/:id`). */
  async updateFolder(id: string, payload: ApiUpdateFolderInput): Promise<FolderItem> {
    const cached = storageService.getFolders();
    const existing = cached.find((f) => f.id === id);
    try {
      const res = await apiClient.patch<{ folder?: ApiFolder } & Partial<ApiFolder>>(`/api/v1/folders/${id}`, payload);
      const updated = normalizeFolder(res?.folder || res);
      storageService.saveFolders(cached.map((f) => (f.id === id ? { ...f, ...updated } : f)));
      return updated;
    } catch (err) {
      if (!/^fld-\d+$/.test(id)) throw err;
      try {
        const promoted = await this.createFolder({
          name: payload.name || existing?.name || 'Carpeta', type: existing?.type || 'image',
          color: payload.color ?? existing?.color ?? '#3b82f6', isPrivate: payload.isPrivate ?? existing?.isPrivate ?? false,
        });
        storageService.removeFolder(id);
        return promoted;
      } catch {
        const localUpdated = normalizeFolder({
          ...existing, id, name: payload.name ?? existing?.name ?? 'Carpeta',
          color: payload.color !== undefined ? payload.color : existing?.color,
          isPrivate: payload.isPrivate !== undefined ? payload.isPrivate : existing?.isPrivate,
        });
        storageService.saveFolders(cached.map((f) => (f.id === id ? localUpdated : f)));
        return localUpdated;
      }
    }
  }

  /**
   * Elimina una carpeta en cascada física y lógica (`DELETE /api/v1/folders/:id`).
   */
  async deleteFolder(id: string): Promise<{ message: string; deletedCount: number }> {
    try {
      const res = await apiClient.delete<{ message: string; deletedCount: number }>(
        `/api/v1/folders/${id}`
      );
      storageService.removeFolder(id);
      return res ?? { message: 'Carpeta eliminada exitosamente', deletedCount: 0 };
    } catch (err) {
      if (/^fld-\d+$/.test(id)) {
        storageService.removeFolder(id);
        return { message: 'Carpeta local eliminada', deletedCount: 0 };
      }
      throw err;
    }
  }

  /**
   * Reasigna una imagen a otra carpeta de tipo IMAGE en PostgreSQL (`PATCH /api/v1/images/:id/folder`).
   */
  async moveImageToFolder(imageId: string, folderId: string | null): Promise<{ id?: string; folderId?: string | null }> {
    if (folderId) {
      const res = await apiClient.patch<{ image: { id?: string; folderId?: string } }>(`/api/v1/images/${imageId}/folder`, { folderId });
      storageService.moveImageToFolder(imageId, folderId);
      return res.image || { id: imageId, folderId };
    }
    storageService.moveImageToFolder(imageId, null);
    return { id: imageId, folderId: null };
  }

  /**
   * Reasigna una tabla/dataset a otra carpeta de tipo TABLE en PostgreSQL (`PATCH /api/v1/tables/:id/folder`).
   */
  async moveTableToFolder(tableId: string, folderId: string | null): Promise<{ id?: string; folderId?: string | null }> {
    if (folderId) {
      const res = await apiClient.patch<{ table: { id?: string; folderId?: string } }>(`/api/v1/tables/${tableId}/folder`, { folderId });
      storageService.moveTableToFolder(tableId, folderId);
      return res.table || { id: tableId, folderId };
    }
    storageService.moveTableToFolder(tableId, null);
    return { id: tableId, folderId: null };
  }

  /**
   * Comparte una carpeta con un colaborador asignándole permiso inicial (`POST /api/v1/folders/:id/shares`).
   */
  async shareFolder(folderId: string, userId: string, permission: 'READ' | 'EDIT' = 'READ'): Promise<ApiFolderShare> {
    const res = await apiClient.post<{ share: ApiFolderShare }>(`/api/v1/folders/${folderId}/shares`, { userId, permission });
    return res.share;
  }

  /**
   * Lista todos los colaboradores que tienen acceso compartido a una carpeta (`GET /api/v1/folders/:id/shares`).
   */
  async listShares(folderId: string): Promise<ApiFolderShare[]> {
    const res = await apiClient.get<{ shares: ApiFolderShare[] }>(`/api/v1/folders/${folderId}/shares`);
    return res.shares || [];
  }

  /**
   * Modifica el permiso (`READ` <-> `EDIT`) de un colaborador en una carpeta (`PATCH /api/v1/folders/:id/shares/:userId`).
   */
  async updateSharePermission(folderId: string, userId: string, permission: 'READ' | 'EDIT'): Promise<ApiFolderShare> {
    const res = await apiClient.patch<{ share: ApiFolderShare }>(`/api/v1/folders/${folderId}/shares/${userId}`, { permission });
    return res.share;
  }

  /**
   * Revoca y expulsa el acceso de un colaborador sobre una carpeta (`DELETE /api/v1/folders/:id/shares/:userId`).
   */
  async revokeShare(folderId: string, userId: string): Promise<{ revoked: boolean }> {
    const res = await apiClient.delete<{ revoked: boolean }>(`/api/v1/folders/${folderId}/shares/${userId}`);
    return res ?? { revoked: true };
  }
}

export const foldersService = new FoldersService();

