import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tablesService } from './tablesService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('tablesService — Module 15 (Rich Format, MetadataCard & Server Pagination)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('fetchTableDetails extracts multi-level headers, merges, and cellStyles from GET /t/:short_code', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      id: 'tab-rich-1',
      shortCode: 'rich100',
      tableName: 'presupuesto_2026.xlsx',
      columns: ['region', 'q1', 'q2'],
      headers: [
        ['Geografía', 'Ingresos Trimestrales', 'Ingresos Trimestrales'],
        ['region', 'q1', 'q2'],
      ],
      merges: ['B1:C1'],
      cellStyles: {
        '0': {
          q1: { bg: '#dcfce7', bold: true, align: 'right' },
        },
      },
      data: [{ region: 'Norte', q1: 15000, q2: 18000 }],
      meta: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasNext: false,
      },
    });

    const details = await tablesService.fetchTableDetails('rich100', 1, 50);

    expect(details.headers).toHaveLength(2);
    expect(details.merges).toEqual(['B1:C1']);
    expect(details.cellStyles?.['0']).toEqual({
      q1: { bg: '#dcfce7', bold: true, align: 'right' },
    });
    expect(details.data).toHaveLength(1);
  });

  it('updates table metadataCard via PATCH /api/v1/tables/:id/metadata and syncs storage', async () => {
    storageService.addTable({
      id: 'tab-meta-1',
      shortCode: 'mcard01',
      tableName: 'censo.csv',
      rowCount: 120,
      columns: ['estado', 'poblacion'],
      sizeBytes: 4096,
      url: 'http://localhost:3000/t/mcard01',
      createdAt: '2026-10-30T10:00:00Z',
    });

    const payload = {
      title: 'Censo Demográfico 2026',
      description: 'Población proyectada por entidad federativa',
      tags: ['demografía', 'censo'],
      unit: 'habitantes',
      columnsMeta: {
        estado: 'Nombre oficial de la entidad',
        poblacion: 'Total de habitantes',
      },
      hasSummaryRows: true,
    };

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      id: 'tab-meta-1',
      shortCode: 'mcard01',
      metadataCard: payload,
    });

    const updated = await tablesService.updateTableMetadata('tab-meta-1', payload);

    expect(patchSpy).toHaveBeenCalledWith('/api/v1/tables/tab-meta-1/metadata', payload);
    expect(updated.metadataCard).toEqual(payload);
    expect(storageService.getTables()[0].metadataCard).toEqual(payload);
  });

  it('fetches paginated remote tables with page, limit, and folderId query params', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      tables: [
        {
          id: 'tab-p1',
          shortCode: 'tpg01',
          tableName: 'indicadores.xlsx',
          rowCount: 250,
          columns: ['mes', 'valor'],
          sizeBytes: 8192,
          folderId: 'folder-finanzas',
          metadataCard: {
            title: 'Indicadores Financieros',
            unit: 'USD',
          },
          createdAt: '2026-10-30T10:00:00Z',
        },
      ],
      total: 30,
      page: 2,
      limit: 10,
      totalPages: 3,
    });

    const items = await tablesService.fetchRemoteTables({
      page: 2,
      limit: 10,
      folderId: 'folder-finanzas',
    });

    expect(getSpy).toHaveBeenCalledWith('/api/v1/tables?page=2&limit=10&folderId=folder-finanzas');
    expect(items).toHaveLength(1);
    expect(items[0].metadataCard).toEqual({
      title: 'Indicadores Financieros',
      unit: 'USD',
    });
    expect(tablesService.getLastPaginationMeta()).toEqual({
      total: 30,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
  });
});

