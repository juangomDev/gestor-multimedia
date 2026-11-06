import { apiClient } from './apiClient';
import { storageService } from './storageService';
import type {
  ApiFolder,
  ApiFolderListResponse,
  ApiUpdateFolderInput,
  ApiFolderShare,
} from '../types/api';
import type { FolderItem, MediaCategory } from '../types/media';

/**
 * Payload de entrada para crear una carpeta (`POST /api/v1/folders`).
 * Soporta tanto `'IMAGE' | 'TABLE'` como `'image' | 'table'`.
 */
export interface CreateFolderPayload {
  name: string;
  type: 'IMAGE' | 'TABLE' | MediaCategory;
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
  raw?: (Omit<Partial<ApiFolder>, 'type'> & { id?: string; name?: string; type?: string; isShared?: boolean }) | null
): FolderItem {
  const safe = raw || {};
  const normalizedType: MediaCategory =
    String(safe.type || 'IMAGE').toUpperCase() === 'TABLE' ? 'table' : 'image';

  return {
    id: safe.id || `fld-${Date.now()}`,
    name: safe.name || 'General',
    type: normalizedType,
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
 * Servicio centralizado de gestión de carpetas, permisos RBAC y compartición en PostgreSQL (`monolith-backend`).
 * Cubre las 11 rutas de carpetas y reasignación de activos.
 */
export class FoldersService {
  /**
   * Obtiene el listado de carpetas desde PostgreSQL respetando reglas de privacidad (`GET /api/v1/folders`).
   *
   * @param type Filtro opcional por tipo (`'IMAGE' | 'TABLE' | 'image' | 'table'`).
   * @param search Búsqueda opcional por nombre de carpeta.
   * @param page Número de página para paginación.
   * @param limit Cantidad de carpetas por página.
   * @returns Lista de carpetas normalizadas.
   */
  async fetchFolders(
    type?: 'IMAGE' | 'TABLE' | MediaCategory,
    search?: string,
    page?: number,
    limit?: number
  ): Promise<FolderItem[]> {
    const params = new URLSearchParams();
    if (type) params.set('type', type.toUpperCase());
    if (search && search.trim()) params.set('search', search.trim());
    if (page !== undefined) params.set('page', String(page));
    if (limit !== undefined) params.set('limit', String(limit));

    const qs = params.toString();
    const endpoint = qs ? `/api/v1/folders?${qs}` : '/api/v1/folders';

    const res = await apiClient.get<ApiFolderListResponse>(endpoint);
    const folders = (res.folders || []).map((f) => normalizeFolder(f));
    if (!type && !search) storageService.saveFolders(folders);
    return folders;
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
   * Crea una nueva carpeta de imágenes o tablas en PostgreSQL (`POST /api/v1/folders`).
   */
  async createFolder(payload: CreateFolderPayload): Promise<FolderItem> {
    const apiType: 'IMAGE' | 'TABLE' =
      payload.type.toUpperCase() === 'TABLE' ? 'TABLE' : 'IMAGE';

    const res = await apiClient.post<{ folder?: ApiFolder } & Partial<ApiFolder>>(
      '/api/v1/folders',
      {
        name: payload.name.trim(),
        type: apiType,
        color: payload.color,
        isPrivate: payload.isPrivate ?? false,
      }
    );

    const created = normalizeFolder(res?.folder || res);
    storageService.addFolder(created);
    return created;
  }

  /**
   * Actualiza las propiedades de una carpeta existente: nombre, color o privacidad (`PATCH /api/v1/folders/:id`).
   */
  async updateFolder(id: string, payload: ApiUpdateFolderInput): Promise<FolderItem> {
    const cached = storageService.getFolders();
    const existing = cached.find((f) => f.id === id);

    try {
      const res = await apiClient.patch<{ folder?: ApiFolder } & Partial<ApiFolder>>(
        `/api/v1/folders/${id}`,
        payload
      );
      const updated = normalizeFolder(res?.folder || res);
      storageService.saveFolders(cached.map((f) => (f.id === id ? { ...f, ...updated } : f)));
      return updated;
    } catch (err) {
      if (!/^fld-\d+$/.test(id)) throw err;
      try {
        const promoted = await this.createFolder({
          name: payload.name || existing?.name || 'Carpeta',
          type: existing?.type || 'image',
          color: payload.color ?? existing?.color ?? '#3b82f6',
          isPrivate: payload.isPrivate ?? existing?.isPrivate ?? false,
        });
        storageService.removeFolder(id);
        return promoted;
      } catch {
        const localUpdated = normalizeFolder({
          ...existing,
          id,
          name: payload.name ?? existing?.name ?? 'Carpeta',
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
   *
   * @param id UUID de la carpeta a eliminar.
   * @returns Mensaje de confirmación y cantidad de archivos eliminados.
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
   *
   * @param imageId UUID de la imagen.
   * @param folderId UUID de la carpeta destino (o `null` para raíz local).
   * @returns Confirmación con los datos de la imagen reasignada.
   */
  async moveImageToFolder(
    imageId: string,
    folderId: string | null
  ): Promise<{ id?: string; folderId?: string | null }> {
    if (folderId) {
      const res = await apiClient.patch<{ image: { id?: string; folderId?: string } }>(
        `/api/v1/images/${imageId}/folder`,
        { folderId }
      );
      storageService.moveImageToFolder(imageId, folderId);
      return res.image || { id: imageId, folderId };
    }
    storageService.moveImageToFolder(imageId, null);
    return { id: imageId, folderId: null };
  }

  /**
   * Reasigna una tabla/dataset a otra carpeta de tipo TABLE en PostgreSQL (`PATCH /api/v1/tables/:id/folder`).
   *
   * @param tableId UUID de la tabla.
   * @param folderId UUID de la carpeta destino (o `null` para raíz local).
   * @returns Confirmación con los datos de la tabla reasignada.
   */
  async moveTableToFolder(
    tableId: string,
    folderId: string | null
  ): Promise<{ id?: string; folderId?: string | null }> {
    if (folderId) {
      const res = await apiClient.patch<{ table: { id?: string; folderId?: string } }>(
        `/api/v1/tables/${tableId}/folder`,
        { folderId }
      );
      storageService.moveTableToFolder(tableId, folderId);
      return res.table || { id: tableId, folderId };
    }
    storageService.moveTableToFolder(tableId, null);
    return { id: tableId, folderId: null };
  }

  /**
   * Comparte una carpeta con un colaborador asignándole permiso inicial (`POST /api/v1/folders/:id/shares`).
   *
   * @param folderId UUID de la carpeta a compartir.
   * @param userId UUID del colaborador destinatario.
   * @param permission Nivel de acceso inicial (`'READ'` o `'EDIT'`).
   * @returns El registro de permiso compartido creado.
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
   *
   * @param folderId UUID de la carpeta.
   * @returns Arreglo de miembros compartidos con sus permisos (`READ` / `EDIT`).
   */
  async listShares(folderId: string): Promise<ApiFolderShare[]> {
    const res = await apiClient.get<{ shares: ApiFolderShare[] }>(
      `/api/v1/folders/${folderId}/shares`
    );
    return res.shares || [];
  }

  /**
   * Modifica el permiso (`READ` <-> `EDIT`) de un colaborador en una carpeta (`PATCH /api/v1/folders/:id/shares/:userId`).
   *
   * @param folderId UUID de la carpeta.
   * @param userId UUID del colaborador.
   * @param permission Nuevo nivel de permiso (`'READ'` o `'EDIT'`).
   * @returns El registro de permiso actualizado.
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
   *
   * @param folderId UUID de la carpeta.
   * @param userId UUID del colaborador a revocar.
   * @returns `{ revoked: boolean }` confirmando la expulsión.
   */
  async revokeShare(folderId: string, userId: string): Promise<{ revoked: boolean }> {
    const res = await apiClient.delete<{ revoked: boolean }>(
      `/api/v1/folders/${folderId}/shares/${userId}`
    );
    return res ?? { revoked: true };
  }
}

export const foldersService = new FoldersService();

