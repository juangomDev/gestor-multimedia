import { describe, it, expect, vi, beforeEach } from 'vitest';
import { healthService } from './healthService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('healthService — Módulo 17 (diagnóstico enriquecido y documentación)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('normalizes `database` alias into `db` and preserves `uptime`', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      status: 'ok',
      db: 'down',
      database: 'up',
      storage: 'writable',
      uptime: 3720,
      timestamp: '2026-11-05T12:00:00Z',
    });

    const res = await healthService.checkHealth();
    expect(res.db).toBe('up');
    expect(res.uptime).toBe(3720);
    expect(typeof res.latencyMs).toBe('number');
  });

  it('builds /docs and /openapi.json URLs from configured baseUrl', () => {
    storageService.saveConfig({ ...storageService.getConfig(), baseUrl: 'https://api.example.com/' });
    expect(healthService.getDocsUrl()).toBe('https://api.example.com/docs');
    expect(healthService.getOpenApiUrl()).toBe('https://api.example.com/openapi.json');
  });

  it('fetches raw OpenAPI spec from GET /openapi.json without auth', async () => {
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ openapi: '3.1.0', paths: {} });
    const spec = await healthService.fetchOpenApiSpec();
    expect(spec.openapi).toBe('3.1.0');
    expect(spy).toHaveBeenCalledWith('/openapi.json', expect.objectContaining({ skipAuth: true }));
  });
});

