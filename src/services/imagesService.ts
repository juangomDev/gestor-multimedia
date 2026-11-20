import { apiClient } from './apiClient';
import { storageService } from './storageService';
import { buildPublicAssetUrl, buildVersionedAssetUrl } from '../utils/formatters';
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

/** Respuesta estructurada de listado paginado de imágenes. */
export interface PaginatedImagesResult {
  items: ImageItem[];
  meta: ImagesPaginationMeta;
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

/** Extensiones de imagen aceptadas por el cliente. */
export const ACCEPTED_IMAGE_EXTENSIONS = '.png,.jpg,.jpeg,.webp,.gif,.svg';

/**
 * Valida si un archivo es una imagen soportada por `monolith-backend`.
 *
 * @param file Archivo a validar antes de subir o sustituir.
 * @returns `true` si el MIME o la extensión corresponden a una imagen válida.
 */
export function isSupportedImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
}

/**
 * Normaliza una respuesta cruda de imagen hacia `ImageItem`.
 */
function normalizeImage(
  raw: Partial<RawApiImage>,
  baseUrl: string,
  fallback?: { id?: string; fileName?: string; mimeType?: string; sizeBytes?: number; folderId?: string | null }
): ImageItem {
  const id = raw.id || fallback?.id || '';
  const shortCode = raw.shortCode || id;
  const canonicalUrl = buildPublicAssetUrl(baseUrl, 'i', shortCode);

  return {
    id,
    shortCode,
    originalName: raw.originalName || fallback?.fileName || shortCode,
    mimeType: raw.mimeType || fallback?.mimeType || 'image/jpeg',
    sizeBytes: raw.sizeBytes ?? fallback?.sizeBytes ?? 0,
    width: raw.width ?? null,
    height: raw.height ?? null,
    url: canonicalUrl,
    urlWithVersion: raw.urlWithVersion
      ? buildVersionedAssetUrl(canonicalUrl, raw.urlWithVersion, raw.updatedAt)
      : undefined,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt,
    folderId: raw.folderId !== undefined ? raw.folderId : fallback?.folderId ?? null,
  };
}

/**
 * Servicio HTTP sin estado de gestión de imágenes conectado a `monolith-backend`
 * (subida, renombrado en caliente, reemplazo binario Hot-Swap, variantes WebP y paginación).
 */
export class ImagesService {
  /**
   * Sube una nueva imagen al servidor (`POST /api/v1/images`).
   *
   * @param file Archivo binario de imagen.
   * @param folderId UUID de carpeta destino de tipo `IMAGE`.
   * @returns Registro de imagen creado y normalizado.
   */
  async uploadImage(file: File, folderId?: string | null): Promise<ImageItem> {
    if (!isSupportedImageFile(file)) {
      throw new Error(`El archivo '${file.name}' no es una imagen válida`);
    }

    const formData = new FormData();
    if (folderId) formData.append('folderId', folderId);
    formData.append('file', file);

    const rawRes = await apiClient.post<RawApiImage & { image?: RawApiImage }>(
      '/api/v1/images',
      formData
    );
    const res = rawRes.image || rawRes;
    return normalizeImage(res, storageService.getApiBaseUrl(), {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      folderId: folderId ?? null,
    });
  }

  /**
   * Renombra en caliente una imagen existente en el servidor (`PATCH /api/v1/images/:id`).
   *
   * @param id UUID de la imagen.
   * @param originalName Nuevo nombre de archivo.
   * @returns Registro de imagen actualizado.
   */
  async renameImage(id: string, originalName: string): Promise<ImageItem> {
    const trimmed = originalName.trim();
    if (!trimmed) {
      throw new Error('El nombre de la imagen no puede estar vacío');
    }

    const rawRes = await apiClient.patch<Partial<RawApiImage> & { image?: Partial<RawApiImage> }>(
      `/api/v1/images/${id}`,
      { originalName: trimmed }
    );
    const res = rawRes?.image || rawRes || {};
    return normalizeImage(res, storageService.getApiBaseUrl(), {
      id,
      fileName: trimmed,
    });
  }

  /**
   * Reemplaza en caliente el binario de una imagen (`PUT /api/v1/images/:id`) conservando su `shortCode`
   * y URL pública compartida, e invalidando caché con `urlWithVersion`.
   *
   * @param id UUID de la imagen a sustituir.
   * @param file Nuevo archivo de imagen.
   * @returns Registro de imagen actualizado.
   */
  async replaceImage(id: string, file: File): Promise<ImageItem> {
    if (!isSupportedImageFile(file)) {
      throw new Error(`El archivo '${file.name}' no es una imagen válida`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const rawRes = await apiClient.put<Partial<RawApiImage> & { image?: Partial<RawApiImage> }>(
      `/api/v1/images/${id}`,
      formData
    );
    const res = rawRes?.image || rawRes || {};
    const baseUrl = storageService.getApiBaseUrl();
    const versionTimestamp = Date.now();
    const normalized = normalizeImage(res, baseUrl, {
      id,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    return {
      ...normalized,
      urlWithVersion: normalized.urlWithVersion || `${normalized.url}?v=${versionTimestamp}`,
      updatedAt: normalized.updatedAt || new Date(versionTimestamp).toISOString(),
    };
  }

  /**
   * Elimina una imagen del servidor (`DELETE /api/v1/images/:id`).
   *
   * @param id UUID de la imagen a eliminar.
   */
  async deleteImage(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/images/${id}`);
  }

  /**
   * Lista imágenes paginadas y filtradas desde `GET /api/v1/images` devolviendo items y metadatos.
   *
   * @param options Parámetros de paginación, carpeta y búsqueda.
   * @returns Objetos `items` y `meta` de paginación server-side.
   */
  async listImages(options?: FetchImagesOptions): Promise<PaginatedImagesResult> {
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.folderId) params.set('folderId', options.folderId);
    if (options?.search && options.search.trim()) params.set('search', options.search.trim());

    const qs = params.toString();
    const res = await apiClient.get<{
      images?: RawApiImage[];
      meta?: Partial<ImagesPaginationMeta>;
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    }>(qs ? `/api/v1/images?${qs}` : '/api/v1/images');

    const baseUrl = storageService.getApiBaseUrl();
    const items = (res.images || []).map((img) => normalizeImage(img, baseUrl));

    const total = res.meta?.total ?? res.total ?? items.length;
    const page = res.meta?.page ?? res.page ?? options?.page ?? 1;
    const limit = res.meta?.limit ?? res.limit ?? options?.limit ?? Math.max(items.length, 50);
    const totalPages =
      res.meta?.totalPages ?? res.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));
    const meta: ImagesPaginationMeta = { total, page, limit, totalPages };

    return { items, meta };
  }

  /**
   * Construye la URL pública corta (`/i/:shortCode`) de una imagen.
   */
  getImageUrl(shortCode: string): string {
    return buildPublicAssetUrl(storageService.getApiBaseUrl(), 'i', shortCode);
  }

  /**
   * Construye la URL optimizada de una imagen con variante (`thumb` WebP u `original`)
   * e invalidación de caché mediante el parámetro `?v=` de `urlWithVersion`.
   */
  getImageVariantUrl(
    image: Pick<ImageItem, 'shortCode' | 'urlWithVersion' | 'updatedAt'>,
    variant: 'thumb' | 'original' = 'original'
  ): string {
    const canonicalUrl = buildPublicAssetUrl(
      storageService.getApiBaseUrl(),
      'i',
      image.shortCode
    );
    const match = image.urlWithVersion ? /[?&]v=([^&#]+)/.exec(image.urlWithVersion) : null;
    const queryParts = [`variant=${variant}`];
    if (match?.[1]) queryParts.push(`v=${encodeURIComponent(match[1])}`);
    return `${canonicalUrl}?${queryParts.join('&')}`;
  }
}

/** Instancia singleton del servicio de imágenes. */
export const imagesService = new ImagesService();
