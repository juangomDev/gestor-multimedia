import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectNotificationsStream, parseSseBlock } from './notificationsStream';
import { apiClient } from './apiClient';
import { storageService } from './storageService';
import type { NotificationItem } from '../types/notifications';

/**
 * Crea un `ReadableStream<Uint8Array>` simulando fragmentos enviados por Fastify SSE.
 */
function createChunkedStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let idx = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (idx < chunks.length) {
        controller.enqueue(encoder.encode(chunks[idx]));
        idx += 1;
      } else {
        controller.close();
      }
    },
  });
}

describe('notificationsStream (v2 — fetch + ReadableStream SSE con Authorization: Bearer)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
    storageService.saveSession({
      token: 'jwt-sse-initial',
      user: { id: 'u-1', username: 'admin', role: 'ADMIN' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parseSseBlock ignora heartbeats y decodifica event, id y data multilínea', () => {
    expect(parseSseBlock(':heartbeat\n:keepalive')).toBeNull();

    const parsed = parseSseBlock(
      'id: 42\nevent: notification\ndata: {"id":"n-1",\ndata: "title":"Nueva entrada"}'
    );
    expect(parsed).toEqual({
      id: '42',
      event: 'notification',
      data: '{"id":"n-1",\n"title":"Nueva entrada"}',
    });
  });

  it('envía cabecera Authorization: Bearer sin ?token= en URL y procesa tramas fragmentadas', async () => {
    const received: NotificationItem[] = [];
    const onConnected = vi.fn();

    const stream = createChunkedStream([
      ':heartbeat\n\n',
      'event: notification\ndata: {"id":"ntf-1","type":"FORM_NEW_ENTRY","title":"Denuncia",',
      '"message":"Registro #10","metadata":{"formId":"frm-7"},"isRead":false}\n\n',
    ]);

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const handle = connectNotificationsStream({
      onNotification: (item) => received.push(item),
      onConnected,
      initialRetryMs: 5000,
    });

    await vi.waitFor(() => {
      expect(received).toHaveLength(1);
    });

    handle.disconnect();

    expect(onConnected).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe('http://localhost:3000/api/v1/notifications/stream');
    expect(calledUrl).not.toContain('token=');
    expect(calledInit.credentials).toBe('include');
    expect((calledInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer jwt-sse-initial'
    );
    expect((calledInit.headers as Record<string, string>).Accept).toBe('text/event-stream');

    expect(received[0]).toMatchObject({
      id: 'ntf-1',
      type: 'FORM_NEW_ENTRY',
      title: 'Denuncia',
      message: 'Registro #10',
      resourceId: 'frm-7',
      read: false,
    });
  });

  it('renueva el access token vía apiClient.refreshAccessToken() ante HTTP 401 y reconecta', async () => {
    const received: NotificationItem[] = [];
    const refreshSpy = vi
      .spyOn(apiClient, 'refreshAccessToken')
      .mockImplementation(async () => {
        storageService.saveToken('jwt-sse-refreshed');
        return 'jwt-sse-refreshed';
      });

    const streamAfterRefresh = createChunkedStream([
      'event: notification\ndata: {"id":"ntf-2","type":"SYSTEM","title":"Reconectado","message":"OK"}\n\n',
    ]);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(streamAfterRefresh, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const handle = connectNotificationsStream({
      onNotification: (item) => received.push(item),
      initialRetryMs: 5000,
    });

    await vi.waitFor(() => {
      expect(received).toHaveLength(1);
    });

    handle.disconnect();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((secondInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer jwt-sse-refreshed'
    );
    expect(received[0].title).toBe('Reconectado');
  });

  it('aborta la conexión activa al invocar disconnect() y no reconecta', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise(() => {
        // Simula stream abierto indefinidamente
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const handle = connectNotificationsStream({
      onNotification: vi.fn(),
      initialRetryMs: 50,
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(capturedSignal?.aborted).toBe(false);
    handle.disconnect();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
