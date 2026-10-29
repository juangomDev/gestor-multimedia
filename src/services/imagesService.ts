import { apiClient } from './apiClient';
import { storageService } from './storageService';
import { buildPublicAssetUrl } from '../utils/formatters';
import type { ImageItem } from '../types/media';

export class ImagesService {
  async uploadImage(file: File, folderId?: string | null): Promise<ImageItem> {
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
    if (!isImage) {
      throw new Error(`El archivo '${file.name}' no es una imagen válida`);
    }

    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folderId', folderId);
    }

    const res = await apiClient.post<{
      id: string;
      shortCode: string;
      url?: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      createdAt?: string;
    }>('/api/v1/images', formData);

    const base = storageService.getConfig().baseUrl;
    const item: ImageItem = {
      id: res.id,
      shortCode: res.shortCode,
      originalName: res.originalName || file.name,
      mimeType: res.mimeType || file.type || 'image/jpeg',
      sizeBytes: res.sizeBytes ?? file.size,
      url: buildPublicAssetUrl(base, 'i', res.shortCode),
      createdAt: res.createdAt || new Date().toISOString(),
      folderId: folderId || null,
    };

    storageService.addImage(item);
    return item;
  }

  async deleteImage(id: string, shortCode?: string): Promise<void> {
    await apiClient.delete(`/api/v1/images/${id}`);
    storageService.removeImage(id);
    if (shortCode) {
      storageService.removeImage(shortCode);
    }
  }

  getImages(folderId?: string | null): ImageItem[] {
    const all = storageService.getImages();
    if (folderId === undefined) return all;
    return all.filter((i) => (folderId ? i.folderId === folderId : !i.folderId));
  }

  async fetchRemoteImages(): Promise<ImageItem[]> {
    try {
      const res = await apiClient.get<{
        images: Array<{
          id: string;
          shortCode: string;
          url: string;
          originalName: string;
          mimeType: string;
          sizeBytes: number;
          createdAt: string;
          folderId?: string | null;
        }>;
        total: number;
      }>('/api/v1/images');

      const base = storageService.getConfig().baseUrl;
      const items: ImageItem[] = (res.images || []).map((img) => ({
        id: img.id,
        shortCode: img.shortCode,
        originalName: img.originalName,
        mimeType: img.mimeType,
        sizeBytes: img.sizeBytes,
        url: buildPublicAssetUrl(base, 'i', img.shortCode),
        createdAt: img.createdAt,
        folderId: img.folderId || null,
      }));

      // La base de datos es la fuente de verdad: sincronizamos el almacenamiento local
      storageService.saveImages(items);
      return items;
    } catch (err: any) {
      console.warn('No se pudo sincronizar imágenes remotas:', err?.message || err);
      return storageService.getImages();
    }
  }

  getImageUrl(shortCode: string): string {
    const base = storageService.getConfig().baseUrl;
    return buildPublicAssetUrl(base, 'i', shortCode);
  }
}

export const imagesService = new ImagesService();
