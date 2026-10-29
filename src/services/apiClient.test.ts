import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from './apiClient';
import { storageService } from './storageService';

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('makes GET request and parses JSON response with Authorization and X-API-Key', async () => {
    storageService.saveConfig({ baseUrl: 'http://localhost:3000', apiKey: 'test-api-key' });
    storageService.saveSession({ token: 'jwt.token.abc', user: { id: '1', username: 'test', role: 'USER' } });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.get<{ status: string }>('/health');

    expect(res).toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('http://localhost:3000/health');
    const headers = calledInit.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt.token.abc');
    expect(headers.get('X-API-Key')).toBe('test-api-key');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('handles 204 No Content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.delete('/api/v1/images/123');
    expect(res).toBeUndefined();
  });

  it('throws ApiError with server error details on non-200 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Credenciales inválidas' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.post('/api/v1/auth/login', { username: 'bad', password: 'bad' }))
      .rejects.toThrow('Credenciales inválidas');
  });

  it('handles network failure gracefully', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.get('/health')).rejects.toThrow(ApiError);
  });
});
