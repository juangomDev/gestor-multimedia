import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from './apiClient';
import { storageService } from './storageService';

describe('apiClient (v2 — Bearer, RFC 7807, FormData y Descargas)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
    storageService.saveConfig({ baseUrl: 'http://localhost:3000' });
    storageService.saveSession({
      token: 'jwt.token.abc',
      user: { id: '1', username: 'test', role: 'ADMIN' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envía GET con Authorization Bearer, credentials include y cero X-API-Key por defecto', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.get<{ status: string }>('/health');
    expect(res).toEqual({ status: 'ok' });

    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('http://localhost:3000/health');
    expect(calledInit.credentials).toBe('include');
    const headers = calledInit.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt.token.abc');
    expect(headers.get('X-API-Key')).toBeNull();
  });

  it('omite Content-Type en DELETE sin cuerpo y soporta 204 No Content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.delete('/api/v1/images/123');
    expect(res).toBeUndefined();
    const [, calledInit] = fetchMock.mock.calls[0];
    expect((calledInit.headers as Headers).get('Content-Type')).toBeNull();
  });

  it('ejecuta PATCH y PUT con JSON serializado y preserva Content-Type nativo en PUT FormData', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ updated: true, originalName: 'nuevo-banner.png' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 'img-123', replaced: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const patchRes = await apiClient.patch<{ updated: boolean }>('/api/v1/images/img-123', {
      originalName: 'nuevo-banner.png',
    });
    expect(patchRes.updated).toBe(true);
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ originalName: 'nuevo-banner.png' }));

    const formData = new FormData();
    formData.append('file', new Blob(['fake'], { type: 'image/png' }), 'banner.png');
    const putFormRes = await apiClient.put<{ replaced: boolean }>('/api/v1/images/img-123', formData);
    expect(putFormRes.replaced).toBe(true);
    expect((fetchMock.mock.calls[1][1].headers as Headers).get('Content-Type')).toBeNull();

    const putJsonRes = await apiClient.put<{ success: boolean }>('/api/v1/resource/1', { title: 'Test' });
    expect(putJsonRes.success).toBe(true);
    expect(fetchMock.mock.calls[2][1].body).toBe(JSON.stringify({ title: 'Test' }));
  });

  it('decodifica errores RFC 7807 (ProblemDetails + invalidParams) y errores de red', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/problem+json' }),
        json: async () => ({
          type: 'https://httpstatuses.com/400',
          title: 'Bad Request',
          status: 400,
          detail: 'El archivo excede el tamaño máximo permitido de 50MB',
          code: 'PAYLOAD_TOO_LARGE',
          instance: '/api/v1/images',
          invalidParams: [{ name: 'file', reason: 'Tamaño excedido' }],
        }),
      }).mockRejectedValueOnce(new Error('Failed to fetch'))
    );

    await expect(apiClient.post('/api/v1/images', {})).rejects.toMatchObject({
      status: 400,
      code: 'PAYLOAD_TOO_LARGE',
      detail: 'El archivo excede el tamaño máximo permitido de 50MB',
      title: 'Bad Request',
      instance: '/api/v1/images',
      invalidParams: [{ name: 'file', reason: 'Tamaño excedido' }],
    });

    await expect(apiClient.get('/health')).rejects.toThrow(ApiError);
  });

  it('soporta responseType explícito (blob y text)', async () => {
    const mockBlob = new Blob(['hola mundo'], { type: 'text/plain' });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/octet-stream' }),
          blob: async () => mockBlob,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'text/csv' }),
          text: async () => 'col1,col2\nval1,val2',
        })
    );

    expect(await apiClient.get<Blob>('/t/short123?download=true', { responseType: 'blob' })).toBe(mockBlob);
    expect(await apiClient.get<string>('/export.csv', { responseType: 'text' })).toBe('col1,col2\nval1,val2');
  });

  it('download() extrae filename estándar, UTF-8 (RFC 5987) y propaga RFC 7807 en error', async () => {
    const csvBlob = new Blob(['1,2,3'], { type: 'text/csv' });
    const pngBlob = new Blob(['img'], { type: 'image/png' });

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({
            'content-type': 'text/csv',
            'content-disposition': 'attachment; filename="ventas_anuales_2026.csv"',
          }),
          blob: async () => csvBlob,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({
            'content-type': 'image/png',
            'content-disposition': "attachment; filename*=UTF-8''gr%C3%A1fico%20estad%C3%ADstico.png",
          }),
          blob: async () => pngBlob,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ code: 'NOT_FOUND', detail: 'Dataset no encontrado en el sistema' }),
        })
    );

    const csv = await apiClient.download('/t/abc12345?download=true');
    expect(csv.filename).toBe('ventas_anuales_2026.csv');
    expect(csv.blob).toBe(csvBlob);

    const png = await apiClient.download('/i/img12345');
    expect(png.filename).toBe('gráfico estadístico.png');

    await expect(apiClient.download('/t/inexistente?download=true')).rejects.toThrow(
      'Dataset no encontrado en el sistema'
    );
  });

  it('tolera respuestas JSON 200 vacías y elimina opciones internas antes de llamar a fetch()', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.post('/api/v1/auth/logout', undefined, {
      skipAuth: true,
      timeoutMs: 8000,
    });
    expect(res).toBeUndefined();
    const [, init] = fetchMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(init.skipAuth).toBeUndefined();
    expect(init.timeoutMs).toBeUndefined();
    expect(init.responseType).toBeUndefined();
  });

  it('clasifica cancelación externa vía AbortSignal como ABORTED (no 408 TIMEOUT)', async () => {
    const external = new AbortController();
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const pending = apiClient.get('/api/v1/images', { signal: external.signal, timeoutMs: 30_000 });
    external.abort();

    await expect(pending).rejects.toMatchObject({
      status: 0,
      code: 'ABORTED',
    });
  });
});
