import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bulkService } from './bulkService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('bulkService (Módulo 19)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('bulkDeleteImages calls /api/v1/images/bulk-delete and updates storage', async () => {
    storageService.saveImages([
      { id: 'img-1', shortCode: 'a', originalName: '1.jpg', mimeType: 'image/jpeg', sizeBytes: 10, url: '', createdAt: '' },
      { id: 'img-2', shortCode: 'b', originalName: '2.jpg', mimeType: 'image/jpeg', sizeBytes: 10, url: '', createdAt: '' },
      { id: 'img-3', shortCode: 'c', originalName: '3.jpg', mimeType: 'image/jpeg', sizeBytes: 10, url: '', createdAt: '' },
    ]);

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      totalRequested: 2,
      successful: ['img-1', 'img-2'],
      failed: [],
    });

    const report = await bulkService.bulkDeleteImages(['img-1', 'img-2']);

    expect(postSpy).toHaveBeenCalledWith('/api/v1/images/bulk-delete', {
      ids: ['img-1', 'img-2'],
    });
    expect(report.successful).toEqual(['img-1', 'img-2']);
    const remaining = storageService.getImages();
    expect(remaining.map((i) => i.id)).toEqual(['img-3']);
  });

  it('bulkMoveImages calls /api/v1/images/bulk-move and updates folderId in storage', async () => {
    storageService.saveImages([
      { id: 'img-1', shortCode: 'a', originalName: '1.jpg', mimeType: 'image/jpeg', sizeBytes: 10, url: '', createdAt: '', folderId: null },
      { id: 'img-2', shortCode: 'b', originalName: '2.jpg', mimeType: 'image/jpeg', sizeBytes: 10, url: '', createdAt: '', folderId: null },
    ]);

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      totalRequested: 2,
      successful: ['img-1', 'img-2'],
      failed: [],
    });

    const report = await bulkService.bulkMoveImages(['img-1', 'img-2'], 'fld-target-1');

    expect(postSpy).toHaveBeenCalledWith('/api/v1/images/bulk-move', {
      ids: ['img-1', 'img-2'],
      targetFolderId: 'fld-target-1',
    });
    expect(report.successful.length).toBe(2);
    const updated = storageService.getImages();
    expect(updated.every((i) => i.folderId === 'fld-target-1')).toBe(true);
  });

  it('bulkDeleteTables calls /api/v1/tables/bulk-delete and updates storage', async () => {
    storageService.saveTables([
      { id: 'tbl-1', shortCode: 'a', tableName: '1.csv', rowCount: 1, sizeBytes: 10, url: '', createdAt: '' },
      { id: 'tbl-2', shortCode: 'b', tableName: '2.csv', rowCount: 1, sizeBytes: 10, url: '', createdAt: '' },
    ]);

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      totalRequested: 1,
      successful: ['tbl-1'],
      failed: [],
    });

    const report = await bulkService.bulkDeleteTables(['tbl-1']);

    expect(postSpy).toHaveBeenCalledWith('/api/v1/tables/bulk-delete', {
      ids: ['tbl-1'],
    });
    expect(report.successful).toEqual(['tbl-1']);
    const remaining = storageService.getTables();
    expect(remaining.map((t) => t.id)).toEqual(['tbl-2']);
  });

  it('bulkMoveTables calls /api/v1/tables/bulk-move and updates folderId in storage', async () => {
    storageService.saveTables([
      { id: 'tbl-1', shortCode: 'a', tableName: '1.csv', rowCount: 1, sizeBytes: 10, url: '', createdAt: '', folderId: null },
    ]);

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      totalRequested: 1,
      successful: ['tbl-1'],
      failed: [],
    });

    await bulkService.bulkMoveTables(['tbl-1'], 'fld-target-tables');

    expect(postSpy).toHaveBeenCalledWith('/api/v1/tables/bulk-move', {
      ids: ['tbl-1'],
      targetFolderId: 'fld-target-tables',
    });
    expect(storageService.getTables()[0].folderId).toBe('fld-target-tables');
  });

  it('returns empty report without network request when empty list is passed', async () => {
    const postSpy = vi.spyOn(apiClient, 'post');
    const report = await bulkService.bulkDeleteImages([]);
    expect(postSpy).not.toHaveBeenCalled();
    expect(report.totalRequested).toBe(0);
  });
});

