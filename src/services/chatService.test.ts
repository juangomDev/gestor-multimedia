import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatService } from './chatService';
import { apiClient } from './apiClient';

describe('chatService — Module 16 (Tabular RAG & Public Widget Endpoints)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('askInternal() posts to /api/v1/chat/ask with optional folderId and shortCode', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      answer: 'El total de ventas en 2026 fue de 1.250.000 USD.',
      foundInSystem: true,
      sources: [
        {
          tableId: 'tbl-uuid-1',
          tableName: 'ventas_2026.xlsx',
          shortCode: 'vnt2026',
          title: 'Reporte Anual de Ventas 2026',
        },
      ],
      chartData: {
        labels: ['Norte', 'Sur'],
        values: [750000, 500000],
        percentages: [60, 40],
      },
    });

    const result = await chatService.askInternal(
      '  ¿Cuál fue el total de ventas?  ',
      'folder-uuid-10',
      'vnt2026'
    );

    expect(postSpy).toHaveBeenCalledWith('/api/v1/chat/ask', {
      question: '¿Cuál fue el total de ventas?',
      folderId: 'folder-uuid-10',
      shortCode: 'vnt2026',
    });
    expect(result.foundInSystem).toBe(true);
    expect(result.sources).toHaveLength(1);
    expect(result.chartData?.labels).toEqual(['Norte', 'Sur']);
    expect(result.chartData?.percentages).toEqual([60, 40]);
  });

  it('getPublicSuggestions() calls GET /api/v1/public/chat/suggestions with skipAuth', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      suggestions: [
        '¿Cuál es la distribución por región?',
        '¿Qué categoría tiene mayor presupuesto?',
      ],
    });

    const suggestions = await chatService.getPublicSuggestions('pub-folder-1');

    expect(getSpy).toHaveBeenCalledWith(
      '/api/v1/public/chat/suggestions?folderId=pub-folder-1',
      { skipAuth: true }
    );
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toContain('distribución por región');
  });

  it('askPublic() posts to /api/v1/public/chat/ask with skipAuth', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      answer: 'No se encontraron registros públicos para esa consulta.',
      foundInSystem: false,
      sources: [],
      chartData: null,
    });

    const res = await chatService.askPublic('¿Datos de 1990?', 'pub-folder-1');

    expect(postSpy).toHaveBeenCalledWith(
      '/api/v1/public/chat/ask',
      {
        question: '¿Datos de 1990?',
        folderId: 'pub-folder-1',
      },
      { skipAuth: true }
    );
    expect(res.foundInSystem).toBe(false);
    expect(res.chartData).toBeNull();
  });

  it('throws an error when question is empty or whitespace', async () => {
    await expect(chatService.askInternal('   ')).rejects.toThrow(
      'La pregunta no puede estar vacía'
    );
  });
});

