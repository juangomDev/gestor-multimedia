import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  tablesService,
  isSupportedTableFile,
  ACCEPTED_TABLE_EXTENSIONS,
} from './tablesService';
import { chatService } from './chatService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('Fase 21 — Tablas .json y Chat usedAi (v2 Stateless)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
  });

  describe('Tablas .json (uploadTable & hotSwapTable)', () => {
    it('acepta archivos .json, .csv, .xlsx y .xls y rechaza otros formatos', () => {
      expect(ACCEPTED_TABLE_EXTENSIONS).toContain('.json');
      expect(
        isSupportedTableFile(new File(['[{"a":1}]'], 'datos.json', { type: 'application/json' }))
      ).toBe(true);
      expect(
        isSupportedTableFile(new File(['[{"a":1}]'], 'datos.json', { type: '' }))
      ).toBe(true);
      expect(
        isSupportedTableFile(new File(['a,b\n1,2'], 'ventas.csv', { type: 'text/csv' }))
      ).toBe(true);
      expect(
        isSupportedTableFile(new File(['%PDF'], 'manual.pdf', { type: 'application/pdf' }))
      ).toBe(false);
    });

    it('sube un archivo .json válido a POST /api/v1/tables sin escribir en localStorage', async () => {
      const jsonFile = new File(
        [JSON.stringify([{ region: 'Norte', ventas: 1200 }])],
        'ventas_q4.json',
        { type: 'application/json' }
      );

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        id: 'tbl-json-1',
        shortCode: 'jsn2026',
        tableName: 'ventas_q4.json',
        rowCount: 1,
        columns: ['region', 'ventas'],
        sizeBytes: jsonFile.size,
        folderId: 'fld-tbl-1',
        createdAt: '2026-11-19T00:00:00Z',
      });

      const created = await tablesService.uploadTable(jsonFile, 'fld-tbl-1');

      expect(postSpy).toHaveBeenCalledWith('/api/v1/tables', expect.any(FormData));
      expect(created.shortCode).toBe('jsn2026');
      expect(created.tableName).toBe('ventas_q4.json');
      expect(created.columns).toEqual(['region', 'ventas']);
      expect(created.folderId).toBe('fld-tbl-1');
      expect(localStorage.getItem('dokploy_tables')).toBeNull();
    });

    it('reemplaza en caliente (hotSwapTable) una tabla con un archivo .json (PUT /api/v1/tables/:id)', async () => {
      const jsonFile = new File(
        [JSON.stringify([{ region: 'Sur', ventas: 4500 }])],
        'ventas_actualizado.json',
        { type: 'application/json' }
      );

      const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
        id: 'tbl-json-1',
        shortCode: 'jsn2026',
        tableName: 'ventas_actualizado.json',
        rowCount: 1,
        columns: ['region', 'ventas'],
        sizeBytes: jsonFile.size,
        urlWithVersion: 'http://localhost:3000/t/jsn2026?v=999999',
      });

      const replaced = await tablesService.hotSwapTable('tbl-json-1', jsonFile);

      expect(putSpy).toHaveBeenCalledWith('/api/v1/tables/tbl-json-1', expect.any(FormData));
      expect(replaced.shortCode).toBe('jsn2026');
      expect(replaced.urlWithVersion).toContain('?v=999999');
    });

    it('rechaza archivos no soportados en uploadTable y hotSwapTable', async () => {
      const badFile = new File(['hello'], 'notas.txt', { type: 'text/plain' });

      await expect(tablesService.uploadTable(badFile, 'fld-1')).rejects.toThrow('.json');
      await expect(tablesService.hotSwapTable('tbl-1', badFile)).rejects.toThrow('.json');
    });
  });

  describe('Data Chat — Indicador usedAi: boolean (Fase 21)', () => {
    it('expone usedAi=true cuando la respuesta interna fue generada con IA', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        answer: 'Total de ventas: $12,400.',
        foundInSystem: true,
        usedAi: true,
        sources: [{ tableId: 't-1', shortCode: 'jsn2026', tableName: 'ventas.json' }],
        chartData: null,
      });

      const res = await chatService.askInternal('¿Total de ventas?');
      expect(res.usedAi).toBe(true);
      expect(res.foundInSystem).toBe(true);
      expect(res.sources).toHaveLength(1);
    });

    it('expone usedAi=false cuando el backend responde de forma determinista sin LLM', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        answer: 'No se encontraron datos públicos para esta consulta.',
        foundInSystem: false,
        usedAi: false,
        sources: [],
        chartData: null,
      });

      const res = await chatService.askPublic('¿Datos inexistentes?');
      expect(res.usedAi).toBe(false);
      expect(res.foundInSystem).toBe(false);
    });
  });
});
