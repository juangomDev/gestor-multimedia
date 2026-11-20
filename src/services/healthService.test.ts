import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { healthService } from './healthService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('healthService (diagnóstico /health y documentación OpenAPI)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve salud OK, normaliza alias `database` en `db` y conserva `uptime`', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 'ok',
      db: 'down',
      database: 'up',
      storage: 'writable',
      uptime: 3720,
      timestamp: '2026-11-05T12:00:00Z',
    });

    const res = await healthService.checkHealth();
    expect(res.status).toBe('ok');
    expect(res.db).toBe('up');
    expect(res.storage).toBe('writable');
    expect(res.uptime).toBe(3720);
    expect(typeof res.latencyMs).toBe('number');
  });

  it('devuelve estado degraded cuando falla la conexión con el backend', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Connection refused'));

    const res = await healthService.checkHealth();
    expect(res.status).toBe('degraded');
    expect(res.db).toBe('down');
    expect(res.storage).toBe('unwritable');
  });

  it('recupera diagnóstico real de db, storage y uptime desde respuestas HTTP 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 'degraded',
          db: 'up',
          storage: 'unwritable',
          uptime: 945,
          timestamp: '2026-11-20T01:00:00Z',
        }),
      })
    );

    const res = await healthService.checkHealth();
    expect(res.status).toBe('degraded');
    expect(res.db).toBe('up');
    expect(res.storage).toBe('unwritable');
    expect(res.uptime).toBe(945);
    expect(res.timestamp).toBe('2026-11-20T01:00:00Z');
  });

  it('construye URLs de /docs y /openapi.json y consulta /openapi.json con skipAuth', async () => {
    storageService.setApiBaseUrl('https://api.example.com/');
    expect(healthService.getDocsUrl()).toBe('https://api.example.com/docs');
    expect(healthService.getOpenApiUrl()).toBe('https://api.example.com/openapi.json');

    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ openapi: '3.1.0', paths: {} });
    const spec = await healthService.fetchOpenApiSpec();
    expect(spec.openapi).toBe('3.1.0');
    expect(spy).toHaveBeenCalledWith('/openapi.json', expect.objectContaining({ skipAuth: true }));
  });
});
