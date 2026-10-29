import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tablesService } from './tablesService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('tablesService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('uploads valid CSV file, stores it, and returns TableItem', async () => {
    const file = new File(['id,nombre\n1,Alpha'], 'metricas.csv', { type: 'text/csv' });

    const mockResponse = {
      id: 'tab-uuid-1',
      shortCode: 'tab111',
      tableName: 'metricas.csv',
      rowCount: 1,
      columns: ['id', 'nombre'],
      sizeBytes: 25,
      url: 'http://localhost:3000/t/tab111',
      createdAt: '2026-10-28T18:00:00Z',
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse);

    const item = await tablesService.uploadTable(file, 'folder-tables-1');

    expect(item.id).toBe('tab-uuid-1');
    expect(item.shortCode).toBe('tab111');
    expect(item.rowCount).toBe(1);
    expect(item.columns).toEqual(['id', 'nombre']);
    expect(item.folderId).toBe('folder-tables-1');
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(storageService.getTables()).toHaveLength(1);
  });

  it('queries paginated table data', async () => {
    const mockData = {
      data: [{ id: 1, nombre: 'Alpha' }],
      meta: {
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2,
        hasNext: true,
      },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockData);

    const result = await tablesService.getTableData('tab111', 1, 50);

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(100);
    expect(result.meta.totalPages).toBe(2);
    expect(getSpy).toHaveBeenCalledWith('/t/tab111?page=1&limit=50', { skipAuth: true });
  });

  it('generates direct download url', () => {
    storageService.saveConfig({ baseUrl: 'http://localhost:3000' });
    expect(tablesService.getDownloadUrl('tab111')).toBe('http://localhost:3000/t/tab111?download=true');
  });

  it('fetchRemoteTables fetches tables from backend and syncs with storageService', async () => {
    const mockList = {
      tables: [
        {
          id: 'remote-tab-1',
          shortCode: 'rmtTab888',
          url: 'http://localhost:3000/t/rmtTab888',
          tableName: 'analytics.csv',
          rowCount: 42,
          columns: ['metric', 'value'],
          sizeBytes: 1024,
          createdAt: '2026-10-28T19:00:00Z',
        },
      ],
      total: 1,
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockList);

    const items = await tablesService.fetchRemoteTables();

    expect(getSpy).toHaveBeenCalledWith('/api/v1/tables');
    expect(items).toHaveLength(1);
    expect(items[0].shortCode).toBe('rmtTab888');
    expect(items[0].rowCount).toBe(42);
    expect(storageService.getTables()).toHaveLength(1);
  });

  it('normalizes remote table URLs to client baseUrl even if backend returns internal IP', async () => {
    storageService.saveConfig({ baseUrl: 'http://app.sslip.io' });

    const mockList = {
      tables: [
        {
          id: 'remote-tab-int',
          shortCode: 'tabInt999',
          url: 'http://192.168.1.167:8080/t/tabInt999',
          tableName: 'dataset.csv',
          rowCount: 10,
          columns: ['id'],
          sizeBytes: 500,
          createdAt: '2026-10-28T19:00:00Z',
        },
      ],
      total: 1,
    };

    vi.spyOn(apiClient, 'get').mockResolvedValue(mockList);

    const items = await tablesService.fetchRemoteTables();

    expect(items[0].url).toBe('http://app.sslip.io/t/tabInt999');
  });
});
