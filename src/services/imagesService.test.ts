import { describe, it, expect, vi, beforeEach } from 'vitest';
import { imagesService } from './imagesService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('imagesService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('uploads valid image, stores it, and returns ImageItem', async () => {
    const file = new File(['fake-image-bytes'], 'banner.png', { type: 'image/png' });

    const mockResponse = {
      id: 'img-uuid-1',
      shortCode: 'bnr777',
      originalName: 'banner.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      url: 'http://localhost:3000/i/bnr777',
      createdAt: '2026-10-28T18:00:00Z',
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse);

    const item = await imagesService.uploadImage(file, 'folder-1');

    expect(item.id).toBe('img-uuid-1');
    expect(item.shortCode).toBe('bnr777');
    expect(item.folderId).toBe('folder-1');
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(storageService.getImages()).toHaveLength(1);
  });

  it('rejects non-image files with error', async () => {
    const textFile = new File(['hello'], 'doc.txt', { type: 'text/plain' });

    await expect(imagesService.uploadImage(textFile)).rejects.toThrow(
      "El archivo 'doc.txt' no es una imagen válida"
    );
  });

  it('deletes image from backend and storage', async () => {
    storageService.addImage({
      id: 'img-to-del',
      shortCode: 'del123',
      originalName: 'temp.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 500,
      url: 'http://localhost:3000/i/del123',
      createdAt: new Date().toISOString(),
    });

    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);

    await imagesService.deleteImage('img-to-del', 'del123');

    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/images/img-to-del');
    expect(storageService.getImages()).toHaveLength(0);
  });

  it('fetchRemoteImages fetches images from backend and syncs with storageService', async () => {
    const mockList = {
      images: [
        {
          id: 'remote-1',
          shortCode: 'rmt123',
          url: 'http://localhost:3000/i/rmt123',
          originalName: 'remote.png',
          mimeType: 'image/png',
          sizeBytes: 2048,
          createdAt: '2026-10-28T19:00:00Z',
        },
      ],
      total: 1,
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockList);

    const items = await imagesService.fetchRemoteImages();

    expect(getSpy).toHaveBeenCalledWith('/api/v1/images');
    expect(items).toHaveLength(1);
    expect(items[0].shortCode).toBe('rmt123');
    expect(storageService.getImages()).toHaveLength(1);
  });

  it('normalizes remote URLs to client baseUrl even if backend returns internal IP', async () => {
    storageService.saveConfig({ baseUrl: 'http://app.sslip.io' });

    const mockList = {
      images: [
        {
          id: 'remote-internal',
          shortCode: 'intern123',
          url: 'http://192.168.1.167:8080/i/intern123',
          originalName: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 5000,
          createdAt: '2026-10-28T19:00:00Z',
        },
      ],
      total: 1,
    };

    vi.spyOn(apiClient, 'get').mockResolvedValue(mockList);

    const items = await imagesService.fetchRemoteImages();

    expect(items[0].url).toBe('http://app.sslip.io/i/intern123');
  });
});
