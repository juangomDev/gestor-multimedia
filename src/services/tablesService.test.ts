import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  tablesService,
  isSupportedTableFile,
  ACCEPTED_TABLE_EXTENSIONS,
} from './tablesService';
import { apiClient, ApiError } from './apiClient';
import { storageService } from './storageService';

describe('tablesService (v2 — .csv/.xlsx/.json, Formato Rico, MetadataCard y Mutaciones)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
  });

  it('valida extensiones soportadas incluyendo .json y rechaza otros formatos', async () => {
    expect(ACCEPTED_TABLE_EXTENSIONS).toContain('.json');
    expect(
      isSupportedTableFile(new File(['[{"a":1}]'], 'datos.json', { type: 'application/json' }))
    ).toBe(true);
    expect(isSupportedTableFile(new File(['[{"a":1}]'], 'datos.json', { type: '' }))).toBe(true);
    expect(isSupportedTableFile(new File(['a,b\n1,2'], 'ventas.csv', { type: 'text/csv' }))).toBe(
      true
    );

    const badFile = new File(['hello'], 'notas.txt', { type: 'text/plain' });
    expect(isSupportedTableFile(badFile)).toBe(false);
    await expect(tablesService.uploadTable(badFile, 'fld-1')).rejects.toThrow('.json');
    await expect(tablesService.hotSwapTable('tbl-1', badFile)).rejects.toThrow('.json');
  });

  it('uploadTable() sube .csv y .json a POST /api/v1/tables sin tocar localStorage', async () => {
    const csvFile = new File(['id,nombre\n1,Alpha'], 'metricas.csv', { type: 'text/csv' });
    const jsonFile = new File([JSON.stringify([{ region: 'Norte', ventas: 1200 }])], 'q4.json', {
      type: 'application/json',
    });

    const postSpy = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        id: 'tab-uuid-1',
        shortCode: 'tab111',
        tableName: 'metricas.csv',
        rowCount: 1,
        columns: ['id', 'nombre'],
        sizeBytes: 25,
        createdAt: '2026-10-28T18:00:00Z',
      })
      .mockResolvedValueOnce({
        id: 'tbl-json-1',
        shortCode: 'jsn2026',
        tableName: 'q4.json',
        rowCount: 1,
        columns: ['region', 'ventas'],
        sizeBytes: jsonFile.size,
        folderId: 'fld-tbl-1',
        createdAt: '2026-11-19T00:00:00Z',
      });

    const csv = await tablesService.uploadTable(csvFile, 'folder-tables-1');
    expect(csv.shortCode).toBe('tab111');
    expect(csv.folderId).toBe('folder-tables-1');

    const json = await tablesService.uploadTable(jsonFile, 'fld-tbl-1');
    expect(json.shortCode).toBe('jsn2026');
    expect(json.columns).toEqual(['region', 'ventas']);
    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('dokploy_tables')).toBeNull();
  });

  it('listTables() pagina, filtra por folderId/search y normaliza URLs a baseUrl del cliente', async () => {
    storageService.setApiBaseUrl('http://app.sslip.io');
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      tables: [
        {
          id: 'tab-p1',
          shortCode: 'tpg01',
          url: 'http://192.168.1.167:8080/t/tpg01',
          tableName: 'indicadores.xlsx',
          rowCount: 250,
          columns: ['mes', 'valor'],
          sizeBytes: 8192,
          folderId: 'folder-finanzas',
          metadataCard: { title: 'Indicadores Financieros', unit: 'USD' },
          createdAt: '2026-10-30T10:00:00Z',
        },
      ],
      total: 30,
      page: 2,
      limit: 10,
      totalPages: 3,
    });

    const { items, meta } = await tablesService.listTables({
      page: 2,
      limit: 10,
      folderId: 'folder-finanzas',
      search: 'ventas_2026',
    });

    expect(getSpy).toHaveBeenCalledWith(
      '/api/v1/tables?page=2&limit=10&folderId=folder-finanzas&search=ventas_2026'
    );
    expect(items[0].url).toBe('http://app.sslip.io/t/tpg01');
    expect(items[0].metadataCard).toEqual({ title: 'Indicadores Financieros', unit: 'USD' });
    expect(meta).toEqual({ total: 30, page: 2, limit: 10, totalPages: 3 });
  });

  it('listTables() lee paginación OpenAPI anidada en res.meta', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      tables: [
        {
          id: 'tab-m1',
          shortCode: 'tm01',
          tableName: 'datos.csv',
          rowCount: 15,
          sizeBytes: 300,
        },
      ],
      meta: { total: 64, page: 2, limit: 25, totalPages: 3 },
    });

    const { items, meta } = await tablesService.listTables({ page: 2, limit: 25 });
    expect(items).toHaveLength(1);
    expect(meta).toEqual({ total: 64, page: 2, limit: 25, totalPages: 3 });
  });

  it('fetchTableDetails() extrae paginación, headers multinivel, merges, cellStyles y genera downloadUrl', async () => {
    storageService.setApiBaseUrl('http://localhost:3000');
    expect(tablesService.getDownloadUrl('tab111')).toBe('http://localhost:3000/t/tab111?download=true');

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      id: 'tab-rich-1',
      shortCode: 'rich100',
      tableName: 'presupuesto_2026.xlsx',
      columns: ['region', 'q1', 'q2'],
      headers: [
        ['Geografía', 'Ingresos Trimestrales', 'Ingresos Trimestrales'],
        ['region', 'q1', 'q2'],
      ],
      merges: ['B1:C1'],
      cellStyles: { '0': { q1: { bg: '#dcfce7', bold: true, align: 'right' } } },
      data: [{ region: 'Norte', q1: 15000, q2: 18000 }],
      meta: { page: 1, limit: 50, total: 100, totalPages: 2, hasNext: true },
    });

    const details = await tablesService.fetchTableDetails('rich100', 1, 50);
    expect(getSpy).toHaveBeenCalledWith('/t/rich100?page=1&limit=50', { skipAuth: true });
    expect(details.headers).toHaveLength(2);
    expect(details.merges).toEqual(['B1:C1']);
    expect(details.cellStyles?.['0']).toEqual({ q1: { bg: '#dcfce7', bold: true, align: 'right' } });
    expect(details.meta.totalPages).toBe(2);
  });

  it('renameTable(), hotSwapTable(), updateTableMetadata() y deleteTable() operan vía API', async () => {
    const patchSpy = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValueOnce({
        id: 'tbl-123',
        shortCode: 'tab123',
        tableName: 'nuevo_balance.xlsx',
        rowCount: 10,
        columns: ['a', 'b'],
        sizeBytes: 1024,
      })
      .mockResolvedValueOnce({
        id: 'tbl-123',
        shortCode: 'tab123',
        metadataCard: { title: 'Censo 2026', unit: 'habitantes', hasSummaryRows: true },
      });

    const renamed = await tablesService.renameTable('tbl-123', 'nuevo_balance.xlsx');
    expect(patchSpy).toHaveBeenNthCalledWith(1, '/api/v1/tables/tbl-123', {
      tableName: 'nuevo_balance.xlsx',
    });
    expect(renamed.tableName).toBe('nuevo_balance.xlsx');

    const updatedMeta = await tablesService.updateTableMetadata('tbl-123', {
      title: 'Censo 2026',
      unit: 'habitantes',
      hasSummaryRows: true,
    });
    expect(patchSpy).toHaveBeenNthCalledWith(2, '/api/v1/tables/tbl-123/metadata', {
      title: 'Censo 2026',
      unit: 'habitantes',
      hasSummaryRows: true,
    });
    expect(updatedMeta.metadataCard).toEqual({
      title: 'Censo 2026',
      unit: 'habitantes',
      hasSummaryRows: true,
    });

    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({
      id: 'tbl-123',
      shortCode: 'tab123',
      tableName: 'actualizado.json',
      rowCount: 250,
      columns: ['id', 'total'],
      sizeBytes: 8192,
      urlWithVersion: 'http://localhost:3000/t/tab123?v=999999',
    });
    const replaced = await tablesService.hotSwapTable(
      'tbl-123',
      new File(['[{"id":1}]'], 'actualizado.json', { type: 'application/json' })
    );
    expect(putSpy).toHaveBeenCalledWith('/api/v1/tables/tbl-123', expect.any(FormData));
    expect(replaced.urlWithVersion).toContain('?v=999999');

    const deleteSpy = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'No existe'));
    await tablesService.deleteTable('tbl-123');
    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/tables/tbl-123');
    await expect(tablesService.deleteTable('tbl-123')).rejects.toThrow('No existe');
  });
});
