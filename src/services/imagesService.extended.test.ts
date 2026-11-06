import { describe, it, expect, vi, beforeEach } from 'vitest';
import { imagesService } from './imagesService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('imagesService — Module 14 (WebP Variants, Rename, Hot-Swap & Pagination)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('builds WebP thumbnail and original variant URLs with cache-busting v parameter', () => {
    storageService.saveConfig({ baseUrl: 'http://localhost:3000' });

    const imgWithoutVersion = {
      shortCode: 'abc123',
    };
    expect(imagesService.getImageVariantUrl(imgWithoutVersion, 'thumb')).toBe(
      'http://localhost:3000/i/abc123?variant=thumb'
    );
    expect(imagesService.getImageVariantUrl(imgWithoutVersion, 'original')).toBe(
      'http://localhost:3000/i/abc123?variant=original'
    );

    const imgWithVersion = {
      shortCode: 'abc123',
      urlWithVersion: 'http://localhost:3000/i/abc123?v=1730335800000',
    };
    expect(imagesService.getImageVariantUrl(imgWithVersion, 'thumb')).toBe(
      'http://localhost:3000/i/abc123?variant=thumb&v=1730335800000'
    );
    expect(imagesService.getImageVariantUrl(imgWithVersion, 'original')).toBe(
      'http://localhost:3000/i/abc123?variant=original&v=1730335800000'
    );
  });

  it('renames an image in-place via PATCH /api/v1/images/:id and updates local storage', async () => {
    storageService.addImage({
      id: 'img-10',
      shortCode: 'sc10',
      originalName: 'antiguo.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      url: 'http://localhost:3000/i/sc10',
      createdAt: '2026-10-30T10:00:00Z',
    });

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      id: 'img-10',
      shortCode: 'sc10',
      originalName: 'nuevo-banner.png',
      updatedAt: '2026-10-30T11:00:00Z',
    });

    const updated = await imagesService.renameImage('img-10', '  nuevo-banner.png  ');

    expect(patchSpy).toHaveBeenCalledWith('/api/v1/images/img-10', {
      originalName: 'nuevo-banner.png',
    });
    expect(updated.originalName).toBe('nuevo-banner.png');
    expect(storageService.getImages()[0].originalName).toBe('nuevo-banner.png');
  });

  it('replaces image binary via PUT /api/v1/images/:id preserving shortCode and updating metadata & urlWithVersion', async () => {
    storageService.addImage({
      id: 'img-20',
      shortCode: 'keep777',
      originalName: 'hero.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 15000,
      width: 800,
      height: 600,
      url: 'http://localhost:3000/i/keep777',
      createdAt: '2026-10-30T10:00:00Z',
    });

    const newFile = new File(['new-webp-binary-content'], 'hero-v2.webp', {
      type: 'image/webp',
    });

    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({
      id: 'img-20',
      shortCode: 'keep777',
      originalName: 'hero.jpg',
      mimeType: 'image/webp',
      sizeBytes: 8400,
      width: 1920,
      height: 1080,
      url: 'http://localhost:3000/i/keep777',
      urlWithVersion: 'http://localhost:3000/i/keep777?v=1730339999000',
      updatedAt: '2026-10-30T12:30:00Z',
    });

    const replaced = await imagesService.replaceImage('img-20', newFile);

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(putSpy.mock.calls[0][0]).toBe('/api/v1/images/img-20');
    expect(putSpy.mock.calls[0][1]).toBeInstanceOf(FormData);
    expect(replaced.shortCode).toBe('keep777');
    expect(replaced.sizeBytes).toBe(8400);
    expect(replaced.width).toBe(1920);
    expect(replaced.height).toBe(1080);
    expect(replaced.urlWithVersion).toContain('?v=1730339999000');
  });

  it('fetches paginated remote images with page, limit, and folderId query params', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      images: [
        {
          id: 'img-p1',
          shortCode: 'pg001',
          url: 'http://localhost:3000/i/pg001',
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

    const items = await imagesService.fetchRemoteImages({
      page: 2,
      limit: 12,
      folderId: 'folder-abc',
    });

    expect(getSpy).toHaveBeenCalledWith('/api/v1/images?page=2&limit=12&folderId=folder-abc');
    expect(items).toHaveLength(1);
    expect(items[0].width).toBe(640);
    expect(items[0].height).toBe(480);
    expect(imagesService.getLastPaginationMeta()).toEqual({
      total: 45,
      page: 2,
      limit: 12,
      totalPages: 4,
    });
  });
});

