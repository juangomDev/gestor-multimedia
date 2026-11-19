import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatService } from './chatService';
import { apiClient } from './apiClient';

describe('chatService — Fase 21 usedAi traceability (true / false)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('preserva usedAi: true cuando el backend sintetiza con IA en askInternal()', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      answer: 'Síntesis generada por LLM.',
      foundInSystem: true,
      usedAi: true,
      sources: [{ shortCode: 'tbl01', tableName: 'ventas.json' }],
      chartData: null,
    });

    const result = await chatService.askInternal('Resumen trimestral');
    expect(result.usedAi).toBe(true);
    expect(result.sources[0].shortCode).toBe('tbl01');
  });

  it('normaliza usedAi: false cuando la respuesta es directa del sistema en askInternal() y askPublic()', async () => {
    vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        answer: 'Respuesta directa sin LLM.',
        foundInSystem: true,
        usedAi: false,
        sources: [],
        chartData: null,
      })
      .mockResolvedValueOnce({
        answer: 'Respuesta pública directa.',
        foundInSystem: true,
        usedAi: false,
        sources: [],
        chartData: null,
      });

    const internal = await chatService.askInternal('¿Cuántos archivos hay?');
    expect(internal.usedAi).toBe(false);

    const pub = await chatService.askPublic('¿Cuál es el horario?');
    expect(pub.usedAi).toBe(false);
  });
});
