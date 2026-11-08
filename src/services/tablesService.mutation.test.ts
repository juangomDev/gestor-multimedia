import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tablesService } from './tablesService';
import { imagesService } from './imagesService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('tablesService.mutation & search (Módulo 19)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renameTable sends PATCH /api/v1/tables/:id and updates local storage', async () => {
    const existingTable = {
      id: 'tbl-123',
      shortCode: 'tab1234567',
      tableName: 'antiguo.csv',
      rowCount: 10,
      columns: ['a', 'b'],
      sizeBytes: 1024,
      url: 'http://localhost:3000/t/tab1234567',
      createdAt: '2026-11-01T00:00:00Z',
    };
    storageService.saveTables([existingTable]);

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      id: 'tbl-123',
      shortCode: 'tab1234567',
      tableName: 'nuevo_balance.xlsx',
      rowCount: 10,
      columns: ['a', 'b'],
      sizeBytes: 1024,
      updatedAt: '2026-11-08T00:00:00Z',
    });

    const result = await tablesService.renameTable('tbl-123', 'nuevo_balance.xlsx');

    expect(patchSpy).toHaveBeenCalledWith('/api/v1/tables/tbl-123', {
      tableName: 'nuevo_balance.xlsx',
    });
    expect(result.tableName).toBe('nuevo_balance.xlsx');
    const stored = storageService.getTables().find((t) => t.id === 'tbl-123');
    expect(stored?.tableName).toBe('nuevo_balance.xlsx');
  });

  it('replaceTable sends PUT /api/v1/tables/:id with FormData (Hot-Swap)', async () => {
    const existingTable = {
      id: 'tbl-123',
      shortCode: 'tab1234567',
      tableName: 'dataset.csv',
      rowCount: 10,
      columns: ['id'],
      sizeBytes: 500,
      url: 'http://localhost:3000/t/tab1234567',
      createdAt: '2026-11-01T00:00:00Z',
    };
    storageService.saveTables([existingTable]);

    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({
      id: 'tbl-123',
      shortCode: 'tab1234567',
      tableName: 'reemplazo.xlsx',
      rowCount: 250,
      columns: ['id', 'producto', 'total'],
      sizeBytes: 8192,
      urlWithVersion: 'http://localhost:3000/t/tab1234567?v=123456',
      updatedAt: '2026-11-08T00:00:00Z',
    });

    const file = new File(['dummy content'], 'reemplazo.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const result = await tablesService.replaceTable('tbl-123', file);

    expect(putSpy).toHaveBeenCalledWith('/api/v1/tables/tbl-123', expect.any(FormData));
    expect(result.rowCount).toBe(250);
    expect(result.columns).toEqual(['id', 'producto', 'total']);
    expect(result.sizeBytes).toBe(8192);
    expect(result.urlWithVersion).toBe('http://localhost:3000/t/tab1234567?v=123456');
  });

  it('fetchRemoteTables includes ?search= in query string when provided', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      tables: [],
      total: 0,
    });

    await tablesService.fetchRemoteTables({ search: 'ventas_2026' });

    expect(getSpy).toHaveBeenCalledWith(expect.stringContaining('search=ventas_2026'));
  });

  it('fetchRemoteImages includes ?search= in query string when provided', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      images: [],
      total: 0,
    });

    await imagesService.fetchRemoteImages({ search: 'banner_header' });

    expect(getSpy).toHaveBeenCalledWith(expect.stringContaining('search=banner_header'));
  });
});

