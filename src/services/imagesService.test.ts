import { describe, it, expect, vi, beforeEach } from 'vitest';
import { imagesService } from './imagesService';
import { apiClient, ApiError } from './apiClient';
import { storageService } from './storageService';

describe('imagesService (v2 — Subida, Listado, Variantes WebP, Rename, Hot-Swap y Borrado)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
  });

  it('uploadImage() sube imagen válida, normaliza URL y rechaza archivos no-imagen', async () => {
    const file = new File(['fake-image-bytes'], 'banner.png', { type: 'image/png' });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      id: 'img-uuid-1',
      shortCode: 'bnr777',
      originalName: 'banner.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      url: 'http://localhost:3000/i/bnr777',
      createdAt: '2026-10-28T18:00:00Z',
    });

    const item = await imagesService.uploadImage(file, 'folder-1');
    expect(item.id).toBe('img-uuid-1');
    expect(item.shortCode).toBe('bnr777');
    expect(item.folderId).toBe('folder-1');
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('dokploy_images')).toBeNull();

    const textFile = new File(['hello'], 'doc.txt', { type: 'text/plain' });
    await expect(imagesService.uploadImage(textFile)).rejects.toThrow(
      "El archivo 'doc.txt' no es una imagen válida"
    );
  });

  it('listImages() pagina, filtra por folderId/search y normaliza URLs a baseUrl del cliente', async () => {
    storageService.setApiBaseUrl('http://app.sslip.io');
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      images: [
        {
          id: 'img-p1',
          shortCode: 'pg001',
          url: 'http://192.168.1.167:8080/i/pg001',
          urlWithVersion: 'http://localhost:3000/i/pg001?v=1730335800000',
          originalName: 'catalogo.webp',
          mimeType: 'image/webp',
          sizeBytes: 4096,
          width: 640,
          height: 480,
          createdAt: '2026-10-30T10:00:00Z',
          folderId: 'folder-abc',
        },
      ],
      total: 45,
      page: 2,
      limit: 12,
      totalPages: 4,
    });

    const { items, meta } = await imagesService.listImages({
      page: 2,
      limit: 12,
      folderId: 'folder-abc',
      search: 'banner_header',
    });

    expect(getSpy).toHaveBeenCalledWith(
      '/api/v1/images?page=2&limit=12&folderId=folder-abc&search=banner_header'
    );
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('http://app.sslip.io/i/pg001');
    expect(items[0].width).toBe(640);
    expect(meta).toEqual({ total: 45, page: 2, limit: 12, totalPages: 4 });
  });

  it('listImages() lee paginación OpenAPI anidada en res.meta', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      images: [
        {
          id: 'img-m1',
          shortCode: 'm001',
          originalName: 'foto.png',
          mimeType: 'image/png',
          sizeBytes: 512,
        },
      ],
      meta: { total: 88, page: 3, limit: 20, totalPages: 5 },
    });

    const { items, meta } = await imagesService.listImages({ page: 3, limit: 20 });
    expect(items).toHaveLength(1);
    expect(meta).toEqual({ total: 88, page: 3, limit: 20, totalPages: 5 });
  });

  it('getImageVariantUrl() construye variantes thumb y original conservando ?v=', () => {
    storageService.setApiBaseUrl('http://localhost:3000');

    expect(imagesService.getImageVariantUrl({ shortCode: 'abc123' }, 'thumb')).toBe(
      'http://localhost:3000/i/abc123?variant=thumb'
    );
    expect(
      imagesService.getImageVariantUrl(
        { shortCode: 'abc123', urlWithVersion: 'http://localhost:3000/i/abc123?v=1730335800000' },
        'original'
      )
    ).toBe('http://localhost:3000/i/abc123?variant=original&v=1730335800000');
  });

  it('renameImage() y replaceImage() mutan por PATCH y PUT preservando shortCode', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      id: 'img-10',
      shortCode: 'sc10',
      originalName: 'nuevo-banner.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      updatedAt: '2026-10-30T11:00:00Z',
    });

    const renamed = await imagesService.renameImage('img-10', '  nuevo-banner.png  ');
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/images/img-10', {
      originalName: 'nuevo-banner.png',
    });
    expect(renamed.originalName).toBe('nuevo-banner.png');

    const newFile = new File(['new-webp'], 'hero-v2.webp', { type: 'image/webp' });
    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({
      id: 'img-20',
      shortCode: 'keep777',
      originalName: 'hero.jpg',
      mimeType: 'image/webp',
      sizeBytes: 8400,
      width: 1920,
      height: 1080,
      urlWithVersion: 'http://localhost:3000/i/keep777?v=1730339999000',
    });

    const replaced = await imagesService.replaceImage('img-20', newFile);
    expect(putSpy).toHaveBeenCalledWith('/api/v1/images/img-20', expect.any(FormData));
    expect(replaced.shortCode).toBe('keep777');
    expect(replaced.urlWithVersion).toContain('?v=1730339999000');
  });

  it('deleteImage() llama a DELETE /api/v1/images/:id y propaga errores HTTP', async () => {
    const deleteSpy = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Sin permisos'));

    await imagesService.deleteImage('img-to-del');
    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/images/img-to-del');
    await expect(imagesService.deleteImage('img-to-del')).rejects.toThrow('Sin permisos');
  });
});
