import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bulkService } from './bulkService';
import { apiClient } from './apiClient';

describe('bulkService (v2 — Stateless HTTP)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('bulkDeleteImages calls POST /api/v1/images/bulk-delete and returns report', async () => {
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
  });

  it('bulkMoveImages calls POST /api/v1/images/bulk-move with targetFolderId', async () => {
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
    expect(report.successful).toHaveLength(2);
  });

  it('bulkDeleteTables calls POST /api/v1/tables/bulk-delete', async () => {
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
  });

  it('bulkMoveTables calls POST /api/v1/tables/bulk-move with targetFolderId', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      totalRequested: 1,
      successful: ['tbl-1'],
      failed: [],
    });

    const report = await bulkService.bulkMoveTables(['tbl-1'], 'fld-target-tables');

    expect(postSpy).toHaveBeenCalledWith('/api/v1/tables/bulk-move', {
      ids: ['tbl-1'],
      targetFolderId: 'fld-target-tables',
    });
    expect(report.successful).toEqual(['tbl-1']);
  });

  it('returns empty report without network request when empty list is passed', async () => {
    const postSpy = vi.spyOn(apiClient, 'post');
    const report = await bulkService.bulkDeleteImages([]);
    expect(postSpy).not.toHaveBeenCalled();
    expect(report.totalRequested).toBe(0);
  });
});
