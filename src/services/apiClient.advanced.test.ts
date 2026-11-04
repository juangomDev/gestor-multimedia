import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from './apiClient';
import { storageService } from './storageService';

describe('apiClient - Métodos Avanzados & Protocolo RFC 7807 (Módulo 10)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    storageService.saveConfig({ baseUrl: 'http://localhost:3000', apiKey: 'test-api-key' });
    storageService.saveSession({ token: 'jwt.token.abc', user: { id: '1', username: 'test', role: 'ADMIN' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ejecuta PATCH enviando body JSON y cabeceras de autorización', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ updated: true, originalName: 'nuevo-banner.png' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.patch<{ updated: boolean; originalName: string }>(
      '/api/v1/images/img-123',
      { originalName: 'nuevo-banner.png' }
    );

    expect(res).toEqual({ updated: true, originalName: 'nuevo-banner.png' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('http://localhost:3000/api/v1/images/img-123');
    expect(calledInit.method).toBe('PATCH');
    expect(calledInit.body).toBe(JSON.stringify({ originalName: 'nuevo-banner.png' }));
    const headers = calledInit.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt.token.abc');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('ejecuta PUT con FormData respetando Content-Type nativo del navegador (Hot-Swap)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'img-123', shortCode: 'sc-123', replaced: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const formData = new FormData();
    formData.append('file', new Blob(['fake content'], { type: 'image/png' }), 'banner.png');

    const res = await apiClient.put<{ id: string; shortCode: string; replaced: boolean }>(
      '/api/v1/images/img-123',
      formData
    );

    expect(res.replaced).toBe(true);
    const [, calledInit] = fetchMock.mock.calls[0];
    expect(calledInit.method).toBe('PUT');
    expect(calledInit.body).toBe(formData);
    const headers = calledInit.headers as Headers;
    // FormData no debe tener Content-Type forzado a application/json
    expect(headers.get('Content-Type')).toBeNull();
  });

  it('ejecuta PUT con JSON serializado', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiClient.put('/api/v1/resource/1', { title: 'Test' });
    expect(res).toEqual({ success: true });
    const [, calledInit] = fetchMock.mock.calls[0];
    expect(calledInit.method).toBe('PUT');
    expect(calledInit.body).toBe(JSON.stringify({ title: 'Test' }));
  });

  it('decodifica errores estructurados según el estándar RFC 7807 (ProblemDetails e invalidParams)', async () => {
    const problemDetailsPayload = {
      type: 'https://httpstatuses.com/400',
      title: 'Bad Request',
      status: 400,
      detail: 'El archivo excede el tamaño máximo permitido de 50MB',
      code: 'PAYLOAD_TOO_LARGE',
      instance: '/api/v1/images',
      invalidParams: [
        { name: 'file', reason: 'Tamaño de 65MB excede el límite de 50MB' }
      ]
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/problem+json' }),
      json: async () => problemDetailsPayload,
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      await apiClient.post('/api/v1/images', {});
      expect.fail('Debería haber lanzado ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.code).toBe('PAYLOAD_TOO_LARGE');
      expect(err.message).toBe('El archivo excede el tamaño máximo permitido de 50MB');
      expect(err.detail).toBe('El archivo excede el tamaño máximo permitido de 50MB');
      expect(err.title).toBe('Bad Request');
      expect(err.type).toBe('https://httpstatuses.com/400');
      expect(err.instance).toBe('/api/v1/images');
      expect(err.invalidParams).toHaveLength(1);
      expect(err.invalidParams[0]).toEqual({
        name: 'file',
        reason: 'Tamaño de 65MB excede el límite de 50MB',
      });
    }
  });

  it('soporta tipos de respuesta explícitos (blob, text, arrayBuffer)', async () => {
    const mockBlob = new Blob(['hola mundo'], { type: 'text/plain' });
    const fetchBlobMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/octet-stream' }),
      blob: async () => mockBlob,
    });
    vi.stubGlobal('fetch', fetchBlobMock);

    const blobRes = await apiClient.get<Blob>('/t/short123?download=true', { responseType: 'blob' });
    expect(blobRes).toBe(mockBlob);

    const fetchTextMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/csv' }),
      text: async () => 'col1,col2\nval1,val2',
    });
    vi.stubGlobal('fetch', fetchTextMock);

    const textRes = await apiClient.get<string>('/export.csv', { responseType: 'text' });
    expect(textRes).toBe('col1,col2\nval1,val2');
  });

  it('método download() extrae correctamente el nombre de archivo desde Content-Disposition', async () => {
    const mockBlob = new Blob(['1,2,3'], { type: 'text/csv' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="ventas_anuales_2026.csv"',
      }),
      blob: async () => mockBlob,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient.download('/t/abc12345?download=true');

    expect(result.filename).toBe('ventas_anuales_2026.csv');
    expect(result.contentType).toBe('text/csv');
    expect(result.blob).toBe(mockBlob);
  });

  it('método download() soporta nombres de archivo con codificación UTF-8 (RFC 5987)', async () => {
    const mockBlob = new Blob(['[binary]'], { type: 'image/png' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'image/png',
        'content-disposition': "attachment; filename*=UTF-8''gr%C3%A1fico%20estad%C3%ADstico.png",
      }),
      blob: async () => mockBlob,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient.download('/i/img12345');
    expect(result.filename).toBe('gráfico estadístico.png');
  });

  it('método download() lanza ApiError con formato RFC 7807 si el servidor responde con error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ code: 'NOT_FOUND', detail: 'Dataset no encontrado en el sistema' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.download('/t/inexistente?download=true')).rejects.toThrow('Dataset no encontrado en el sistema');
  });
});
