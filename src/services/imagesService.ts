import { apiClient } from './apiClient';
import { storageService } from './storageService';
import { buildPublicAssetUrl } from '../utils/formatters';
import type { ImageItem } from '../types/media';

/** Opciones de paginación y filtrado server-side para listar imágenes. */
export interface FetchImagesOptions {
  page?: number;
  limit?: number;
  folderId?: string | null;
  search?: string;
}

/** Metadatos de paginación devueltos por `GET /api/v1/images`. */
export interface ImagesPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Respuesta cruda de un recurso de imagen en `monolith-backend`. */
interface RawApiImage {
  id: string;
  shortCode: string;
  url?: string;
  urlWithVersion?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  createdAt?: string;
  updatedAt?: string;
  folderId?: string | null;
}

/**
 * Servicio de gestión de imágenes conectado a `monolith-backend`
 * (subida, renombrado en caliente, reemplazo binario Hot-Swap, variantes WebP y paginación).
 */
export class ImagesService {
  private lastPaginationMeta: ImagesPaginationMeta | null = null;

  /**
   * Promueve una carpeta local temporal (`fld-...`) a PostgreSQL si aún no tiene UUID real,
   * y actualiza una imagen en `storageService` insertándola o reemplazándola.
   */
  private async resolveFolderId(folderId?: string | null): Promise<string | null> {
    if (!folderId) return null;
    if (!/^fld-\d+$/.test(folderId)) return folderId;
    const localFolder = storageService.getFolders().find((f) => f.id === folderId);
    if (!localFolder) return null;
    try {
      const folderRes = await apiClient.post<{ folder?: { id: string }; id?: string }>(
        '/api/v1/folders',
        { name: localFolder.name, type: 'IMAGE', color: localFolder.color || '#3b82f6', isPrivate: Boolean(localFolder.isPrivate) }
      );
      const realId = folderRes?.folder?.id || folderRes?.id;
      if (realId) {
        storageService.removeFolder(folderId);
        storageService.addFolder({ ...localFolder, id: realId });
        return realId;
      }
    } catch {
      // Si no se puede promover, continuar sin bloquear la subida
    }
    return null;
  }

  /**
   * Persiste una imagen actualizada en el almacenamiento local.
   */
  private upsertLocalImage(id: string, updated: ImageItem): ImageItem {
    const current = storageService.getImages();
    if (current.some((i) => i.id === id)) {
      storageService.saveImages(current.map((i) => (i.id === id ? updated : i)));
    } else {
      storageService.addImage(updated);
    }
    return updated;
  }

  /**
   * Sube una nueva imagen al servidor (`POST /api/v1/images`) y sincroniza el almacenamiento local.
   */
  async uploadImage(file: File, folderId?: string | null): Promise<ImageItem> {
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)) {
      throw new Error(`El archivo '${file.name}' no es una imagen válida`);
    }

    const resolvedFolderId = await this.resolveFolderId(folderId);
    const formData = new FormData();
    if (resolvedFolderId) formData.append('folderId', resolvedFolderId);
    formData.append('file', file);

    const rawRes = await apiClient.post<RawApiImage & { image?: RawApiImage }>(
      '/api/v1/images',
      formData
    );
    const res = rawRes.image || rawRes;
    const canonicalUrl = buildPublicAssetUrl(storageService.getConfig().baseUrl, 'i', res.shortCode);
    const item: ImageItem = {
      id: res.id, shortCode: res.shortCode, originalName: res.originalName || file.name,
      mimeType: res.mimeType || file.type || 'image/jpeg', sizeBytes: res.sizeBytes ?? file.size,
      width: res.width ?? null, height: res.height ?? null, url: canonicalUrl,
      urlWithVersion: res.urlWithVersion, createdAt: res.createdAt || new Date().toISOString(),
      updatedAt: res.updatedAt, folderId: res.folderId !== undefined ? res.folderId : resolvedFolderId,
    };

    storageService.addImage(item);
    return item;
  }

  /**
   * Renombra en caliente una imagen existente en el servidor (`PATCH /api/v1/images/:id`)
   * y actualiza inmediatamente el estado en almacenamiento local.
   */
  async renameImage(id: string, originalName: string): Promise<ImageItem> {
    let trimmed = originalName.trim();
    if (!trimmed) throw new Error('El nombre de la imagen no puede estar vacío');

    const existing = storageService.getImages().find((i) => i.id === id);
    if (existing?.originalName) {
      const extMatch = /\.(png|jpe?g|webp|gif|svg)$/i.exec(existing.originalName);
      if (extMatch && !/\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed)) trimmed = `${trimmed}${extMatch[0]}`;
    }

    let res: (Partial<RawApiImage> & { id?: string; originalName?: string }) | undefined;
    try {
      const rawRes = await apiClient.patch<
        Partial<RawApiImage> & { id?: string; originalName?: string; image?: Partial<RawApiImage> }
      >(`/api/v1/images/${id}`, { originalName: trimmed });
      res = rawRes?.image || rawRes;
    } catch (err: any) {
      if (!String(err?.message || '').includes('Route PATCH:')) throw err;
    }
    const shortCode = res?.shortCode || existing?.shortCode || id;
    const canonicalUrl = buildPublicAssetUrl(storageService.getConfig().baseUrl, 'i', shortCode);
    const updated: ImageItem = {
      ...(existing || { id, shortCode, mimeType: 'image/png', sizeBytes: 0, url: canonicalUrl, createdAt: new Date().toISOString() }),
      ...res, id: res?.id || id, shortCode, originalName: res?.originalName || trimmed,
      url: canonicalUrl, updatedAt: res?.updatedAt || new Date().toISOString(),
    };
    return this.upsertLocalImage(id, updated);
  }

  /**
   * Reemplaza en caliente el binario de una imagen (`PUT /api/v1/images/:id`) conservando su `shortCode`
   * y URL pública compartida, e invalidando la caché mediante `urlWithVersion`.
   */
  async replaceImage(id: string, file: File): Promise<ImageItem> {
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)) {
      throw new Error(`El archivo '${file.name}' no es una imagen válida`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.put<Partial<RawApiImage>>(`/api/v1/images/${id}`, formData);
    const existing = storageService.getImages().find((i) => i.id === id);
    const shortCode = res?.shortCode || existing?.shortCode || id;
    const canonicalUrl = buildPublicAssetUrl(storageService.getConfig().baseUrl, 'i', shortCode);
    const versionTimestamp = Date.now();

    const updated: ImageItem = {
      ...(existing || { id, shortCode, originalName: file.name, createdAt: new Date().toISOString() }),
      ...res,
      id: res?.id || id,
      shortCode,
      originalName: res?.originalName || existing?.originalName || file.name,
      mimeType: res?.mimeType || file.type || existing?.mimeType || 'image/jpeg',
      sizeBytes: res?.sizeBytes ?? file.size,
      width: res?.width !== undefined ? res.width : existing?.width ?? null,
      height: res?.height !== undefined ? res.height : existing?.height ?? null,
      url: canonicalUrl,
      urlWithVersion: res?.urlWithVersion || `${canonicalUrl}?v=${versionTimestamp}`,
      updatedAt: res?.updatedAt || new Date(versionTimestamp).toISOString(),
    };

    return this.upsertLocalImage(id, updated);
  }

  /**
   * Elimina una imagen del servidor (`DELETE /api/v1/images/:id`) y del almacenamiento local.
   */
  async deleteImage(id: string, shortCode?: string): Promise<void> {
    await apiClient.delete(`/api/v1/images/${id}`);
    storageService.removeImage(id);
    if (shortCode) storageService.removeImage(shortCode);
  }

  /**
   * Obtiene las imágenes almacenadas localmente, opcionalmente filtradas por carpeta.
   */
  getImages(folderId?: string | null): ImageItem[] {
    const all = storageService.getImages();
    if (folderId === undefined) return all;
    return all.filter((i) => (folderId ? i.folderId === folderId : !i.folderId));
  }

  /**
   * Devuelve los metadatos de paginación de la última consulta remota.
   */
  getLastPaginationMeta(): ImagesPaginationMeta | null {
    return this.lastPaginationMeta;
  }

  /**
   * Sincroniza la lista de imágenes desde el backend (`GET /api/v1/images`),
   * soportando paginación server-side (`page`, `limit`) y filtro por `folderId`.
   */
  async fetchRemoteImages(options?: FetchImagesOptions): Promise<ImageItem[]> {
    try {
      const params = new URLSearchParams();
      if (options?.page !== undefined) params.set('page', String(options.page));
      if (options?.limit !== undefined) params.set('limit', String(options.limit));
      if (options?.folderId) params.set('folderId', options.folderId);
      if (options?.search) params.set('search', options.search.trim());

      const qs = params.toString();
      const res = await apiClient.get<{
        images: RawApiImage[]; total?: number; page?: number; limit?: number; totalPages?: number;
      }>(qs ? `/api/v1/images?${qs}` : '/api/v1/images');

      const base = storageService.getConfig().baseUrl;
      const cachedMap = new Map(storageService.getImages().map((i) => [i.id, i]));
      const items: ImageItem[] = (res.images || []).map((img) => {
        const local = cachedMap.get(img.id);
        const keepLocalName =
          local?.updatedAt && (!img.updatedAt || local.updatedAt > img.updatedAt);
        return {
          id: img.id,
          shortCode: img.shortCode,
          originalName: keepLocalName ? local.originalName : img.originalName,
          mimeType: img.mimeType,
          sizeBytes: img.sizeBytes,
          width: img.width ?? null,
          height: img.height ?? null,
          url: buildPublicAssetUrl(base, 'i', img.shortCode),
          urlWithVersion: img.urlWithVersion,
          createdAt: img.createdAt || new Date().toISOString(),
          updatedAt: keepLocalName ? local.updatedAt : img.updatedAt,
          folderId: img.folderId || null,
        };
      });

      const total = res.total ?? items.length;
      const page = res.page ?? options?.page ?? 1;
      const limit = res.limit ?? options?.limit ?? Math.max(items.length, 50);
      const totalPages = res.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));
      this.lastPaginationMeta = { total, page, limit, totalPages };

      if (options?.folderId || (options?.page && options.page > 1) || options?.search) {
        const fetchedIds = new Set(items.map((i) => i.id));
        const others = storageService.getImages().filter((i) => !fetchedIds.has(i.id));
        storageService.saveImages([...items, ...others]);
      } else {
        storageService.saveImages(items);
      }
      return items;
    } catch (err: any) {
      if (storageService.getToken()) {
        console.warn('No se pudo sincronizar imágenes remotas:', err?.message || err);
      }
      return storageService.getImages();
    }
  }

  /**
   * Construye la URL pública corta (`/i/:shortCode`) de una imagen.
   */
  getImageUrl(shortCode: string): string {
    return buildPublicAssetUrl(storageService.getConfig().baseUrl, 'i', shortCode);
  }

  /**
   * Construye la URL optimizada de una imagen con soporte de variante (`thumb` WebP u `original`)
   * e invalidación de caché mediante el parámetro `?v=timestamp` de `urlWithVersion`.
   */
  getImageVariantUrl(
    image: Pick<ImageItem, 'shortCode' | 'urlWithVersion' | 'updatedAt'>,
    variant: 'thumb' | 'original' = 'original'
  ): string {
    const canonicalUrl = buildPublicAssetUrl(
      storageService.getConfig().baseUrl,
      'i',
      image.shortCode
    );
    const match = image.urlWithVersion ? /[?&]v=([^&#]+)/.exec(image.urlWithVersion) : null;
    const queryParts = [`variant=${variant}`];
    if (match?.[1]) queryParts.push(`v=${encodeURIComponent(match[1])}`);
    return `${canonicalUrl}?${queryParts.join('&')}`;
  }
}

export const imagesService = new ImagesService();
