import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from './apiClient';
import { storageService } from './storageService';

describe('apiClient — Cola 401 y rotación de tokens JWT', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
    storageService.saveConfig({ baseUrl: 'http://localhost:3000' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refresca el token ante 401 y reintenta la petición original', async () => {
    storageService.saveSession({
      token: 'expired.token.jwt',
      user: { id: 'usr-1', username: 'admin', role: 'ADMIN' },
    });

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/images') && callCount === 0) {
        callCount++;
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ code: 'UNAUTHORIZED', detail: 'Token has expired' }),
        };
      }
      if (url.includes('/api/v1/auth/refresh')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            token: 'fresh.token.jwt',
            user: { id: 'usr-1', username: 'admin', role: 'ADMIN' },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ images: [{ id: 'img-1' }] }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.get<{ images: Array<{ id: string }> }>('/api/v1/images');
    expect(res).toEqual({ images: [{ id: 'img-1' }] });
    expect(storageService.getToken()).toBe('fresh.token.jwt');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:3000/api/v1/auth/refresh');
    expect((fetchMock.mock.calls[2][1].headers as Headers).get('Authorization')).toBe(
      'Bearer fresh.token.jwt'
    );
  });

  it('encola peticiones concurrentes ante 401 disparando un único POST /auth/refresh', async () => {
    storageService.saveSession({
      token: 'expired.token.jwt',
      user: { id: 'usr-1', username: 'admin', role: 'ADMIN' },
    });

    let refreshDispatchedCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/auth/refresh')) {
        refreshDispatchedCount++;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'concurrency.refreshed.jwt' }),
        };
      }
      const auth = (init?.headers as Headers | undefined)?.get('Authorization');
      if (auth !== 'Bearer concurrency.refreshed.jwt') {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ code: 'UNAUTHORIZED', detail: 'Token expired' }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, url }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const [r1, r2, r3] = await Promise.all([
      apiClient.get('/api/v1/images'),
      apiClient.get('/api/v1/tables'),
      apiClient.get('/api/v1/folders'),
    ]);

    expect(r1).toHaveProperty('success', true);
    expect(r2).toHaveProperty('success', true);
    expect(r3).toHaveProperty('success', true);
    expect(refreshDispatchedCount).toBe(1);
    expect(storageService.getToken()).toBe('concurrency.refreshed.jwt');
  });

  it('dispara onUnauthorized y limpia sesión cuando /auth/refresh falla con 401', async () => {
    storageService.saveSession({
      token: 'revoked.token',
      user: { id: 'usr-1', username: 'admin', role: 'ADMIN' },
    });
    const unauthorizedListener = vi.fn();
    const unsubscribe = apiClient.onUnauthorized(unauthorizedListener);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ code: 'SESSION_REVOKED', detail: 'Refresh token expired' }),
      })
    );

    await expect(apiClient.get('/api/v1/images')).rejects.toThrow(ApiError);
    expect(unauthorizedListener).toHaveBeenCalledTimes(1);
    expect(storageService.getSession()).toBeNull();
    unsubscribe();
  });

  it('NO intenta refrescar el token en /api/v1/auth/login', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ code: 'BAD_CREDENTIALS', detail: 'Usuario o clave inválidos' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiClient.post('/api/v1/auth/login', { username: 'wrong', password: 'bad' })
    ).rejects.toThrow('Usuario o clave inválidos');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('download() reintenta tras refrescar token ante 401 enviando credentials include', async () => {
    storageService.saveSession({
      token: 'expired.jwt.token',
      user: { id: 'u1', username: 'admin', role: 'ADMIN' },
    });
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
      return {
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'text/csv',
          'content-disposition': 'attachment; filename="reporte.csv"',
        }),
        blob: async () => mockBlob,
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.download('/t/abc12345?download=true');
    expect(res.filename).toBe('reporte.csv');
    expect(res.blob).toBe(mockBlob);
    expect(storageService.getToken()).toBe('new.fresh.token');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });
});
