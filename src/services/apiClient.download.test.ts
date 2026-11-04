import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('apiClient.download - Credentials & 401 Token Refresh', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    storageService.saveConfig({ baseUrl: 'http://localhost:3000', apiKey: 'test-key' });
    storageService.saveSession({
      token: 'expired.jwt.token',
      user: { id: 'u1', username: 'admin', role: 'ADMIN' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends credentials: include and retries download after refreshing token on 401', async () => {
    const mockBlob = new Blob(['id,valor\n1,100'], { type: 'text/csv' });
    let downloadCallCount = 0;

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/t/abc12345') && downloadCallCount === 0) {
        downloadCallCount++;
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ code: 'UNAUTHORIZED', detail: 'Token expired' }),
        };
      }

      if (url.includes('/api/v1/auth/refresh')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'new.fresh.token' }),
        };
      }

      if (url.includes('/t/abc12345') && downloadCallCount > 0) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({
            'content-type': 'text/csv',
            'content-disposition': 'attachment; filename="reporte.csv"',
          }),
          blob: async () => mockBlob,
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.download('/t/abc12345?download=true');

    expect(res.filename).toBe('reporte.csv');
    expect(res.blob).toBe(mockBlob);
    expect(storageService.getToken()).toBe('new.fresh.token');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });
});

