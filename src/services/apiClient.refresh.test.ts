import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from './apiClient';
import { storageService } from './storageService';

describe('apiClient - 401 Interceptor and Token Refresh', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('transparently refreshes token on 401 and retries original request', async () => {
    storageService.saveConfig({ baseUrl: 'http://localhost:3000', apiKey: 'test-key' });
    storageService.saveSession({
      token: 'expired.token.jwt',
      user: { id: 'usr-1', username: 'admin', role: 'ADMIN' },
    });

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      // First call to /api/v1/images returns 401 Unauthorized
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

      // Refresh call returns 200 with new token
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

      // Retried call to /api/v1/images returns 200
      if (url.includes('/api/v1/images') && callCount > 0) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ images: [{ id: 'img-1' }] }),
        };
      }

      throw new Error(`Unexpected url: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.get<{ images: any[] }>('/api/v1/images');

    expect(res).toEqual({ images: [{ id: 'img-1' }] });
    expect(storageService.getToken()).toBe('fresh.token.jwt');

    // Expected calls: 1. initial request, 2. refresh request, 3. retried request
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const refreshCall = fetchMock.mock.calls[1];
    expect(refreshCall[0]).toBe('http://localhost:3000/api/v1/auth/refresh');
    expect(refreshCall[1].method).toBe('POST');
    expect(refreshCall[1].credentials).toBe('include');

    const retriedCall = fetchMock.mock.calls[2];
    const retriedHeaders = retriedCall[1].headers as Headers;
    expect(retriedHeaders.get('Authorization')).toBe('Bearer fresh.token.jwt');
  });

  it('queues concurrent requests during active refresh so only ONE refresh is dispatched', async () => {
    storageService.saveConfig({ baseUrl: 'http://localhost:3000', apiKey: 'test-key' });
    storageService.saveSession({
      token: 'expired.token.jwt',
      user: { id: 'usr-1', username: 'admin', role: 'ADMIN' },
    });

    let refreshDispatchedCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/auth/refresh')) {
        refreshDispatchedCount++;
        // Small delay to simulate in-flight refresh
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            token: 'concurrency.refreshed.jwt',
            user: { id: 'usr-1', username: 'admin', role: 'ADMIN' },
          }),
        };
      }

      // Any other call: check Authorization header
      const headers = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]?.[1]?.headers as Headers;
      const auth = headers?.get('Authorization');

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

    // Launch 3 requests concurrently
    const [res1, res2, res3] = await Promise.all([
      apiClient.get('/api/v1/images'),
      apiClient.get('/api/v1/tables'),
      apiClient.get('/api/v1/folders'),
    ]);

    expect(res1).toHaveProperty('success', true);
    expect(res2).toHaveProperty('success', true);
    expect(res3).toHaveProperty('success', true);
    expect(refreshDispatchedCount).toBe(1);
    expect(storageService.getToken()).toBe('concurrency.refreshed.jwt');
  });

  it('triggers onUnauthorized and clears session if refresh token fails with 401', async () => {
    storageService.saveConfig({ baseUrl: 'http://localhost:3000', apiKey: 'test-key' });
    storageService.saveSession({
      token: 'revoked.token',
      user: { id: 'usr-1', username: 'admin', role: 'ADMIN' },
    });

    const unauthorizedListener = vi.fn();
    const unsubscribe = apiClient.onUnauthorized(unauthorizedListener);

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/auth/refresh')) {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ code: 'SESSION_REVOKED', detail: 'Refresh token invalid or expired' }),
        };
      }

      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ code: 'UNAUTHORIZED', detail: 'Invalid token' }),
      };
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.get('/api/v1/images')).rejects.toThrow(ApiError);

    expect(unauthorizedListener).toHaveBeenCalledTimes(1);
    expect(storageService.getSession()).toBeNull();

    unsubscribe();
  });

  it('does NOT attempt refresh for /api/v1/auth/login route', async () => {
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
});
