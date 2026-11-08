import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiKeysService } from './apiKeysService';
import { apiClient } from './apiClient';

describe('apiKeysService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista API Keys invocando GET /api/v1/api-keys cuando la respuesta es un array', async () => {
    const mockKeys = [
      {
        id: 'key-1',
        name: 'CI/CD Key',
        keyPrefix: 'gm_live_1234',
        rateLimit: 120,
        isActive: true,
        lastUsedAt: null,
        createdAt: '2026-11-08T00:00:00Z',
      },
    ];

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockKeys as never);

    const res = await apiKeysService.listApiKeys();
    expect(getSpy).toHaveBeenCalledWith('/api/v1/api-keys');
    expect(res).toEqual(mockKeys);
  });

  it('lista API Keys invocando GET /api/v1/api-keys cuando la respuesta viene encapsulada en { keys: [...] }', async () => {
    const mockKeys = [
      {
        id: 'key-1',
        name: 'CI/CD Key',
        keyPrefix: 'gm_live_1234',
        rateLimit: 120,
        isActive: true,
        lastUsedAt: null,
        createdAt: '2026-11-08T00:00:00Z',
      },
    ];

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ keys: mockKeys } as never);

    const res = await apiKeysService.listApiKeys();
    expect(res).toEqual(mockKeys);
  });

  it('crea una nueva API Key invocando POST /api/v1/api-keys', async () => {
    const createdKey = {
      id: 'key-2',
      name: 'Production Key',
      key: 'gm_live_secret_plain_text',
      keyPrefix: 'gm_live_secr',
      rateLimit: 200,
      isActive: true,
      createdAt: '2026-11-08T00:00:00Z',
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(createdKey as never);

    const res = await apiKeysService.createApiKey({ name: 'Production Key', rateLimit: 200 });
    expect(postSpy).toHaveBeenCalledWith('/api/v1/api-keys', {
      name: 'Production Key',
      rateLimit: 200,
    });
    expect(res).toEqual(createdKey);
  });

  it('elimina una API Key invocando DELETE /api/v1/api-keys/:id', async () => {
    const delSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce(undefined as never);

    const res = await apiKeysService.deleteApiKey('key-1');
    expect(delSpy).toHaveBeenCalledWith('/api/v1/api-keys/key-1');
    expect(res).toBeUndefined();
  });
});
