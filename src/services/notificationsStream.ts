import { apiClient } from './apiClient';
import { storageService } from './storageService';
import { normalizeNotification } from './notificationsService';
import type { NotificationItem } from '../types/notifications';

/**
 * Trama SSE parseada desde el flujo `text/event-stream`.
 */
export interface ParsedSseEvent {
  event: string;
  data: string;
  id?: string;
}

/**
 * Opciones de conexión para el cliente SSE autenticado por cabecera `Authorization: Bearer`.
 */
export interface NotificationsStreamOptions {
  /** Callback ejecutado al recibir una notificación normalizada (`event: notification` o `message`). */
  onNotification: (notification: NotificationItem) => void;
  /** Callback opcional ejecutado cuando el stream HTTP `200` queda establecido. */
  onConnected?: () => void;
  /** Callback opcional ejecutado cuando el stream se desconecta o falla temporalmente. */
  onDisconnected?: () => void;
  /** Callback opcional para registrar o inspeccionar errores de red/protocolo. */
  onError?: (error: unknown) => void;
  /** Callback opcional para tramas SSE personalizadas distintas de `notification`. */
  onEvent?: (frame: ParsedSseEvent) => void;
  /** Retraso inicial de reconexión en milisegundos (por defecto `1000`). */
  initialRetryMs?: number;
  /** Retraso máximo de reconexión con backoff exponencial en milisegundos (por defecto `30000`). */
  maxRetryMs?: number;
}

/**
 * Manejador devuelto al abrir una conexión SSE para cerrarla de forma limpia.
 */
export interface NotificationsStreamHandle {
  /** Cancela la conexión HTTP activa y detiene cualquier reconexión pendiente. */
  disconnect: () => void;
}

/**
 * Parsea un bloque de texto SSE completo (separado por doble salto de línea) extrayendo
 * `event`, `id` y líneas acumuladas de `data`, ignorando comentarios heartbeat (`:...`).
 *
 * @param rawBlock Bloque SSE sin el delimitador final `\n\n`.
 * @returns Trama parseada o `null` si el bloque solo contenía comentarios/heartbeats.
 */
export function parseSseBlock(rawBlock: string): ParsedSseEvent | null {
  const lines = rawBlock.split('\n');
  let eventName = 'message';
  let eventId: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;
    const colonIdx = line.indexOf(':');
    const field = colonIdx === -1 ? line : line.slice(0, colonIdx);
    const rawValue = colonIdx === -1 ? '' : line.slice(colonIdx + 1);
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;

    if (field === 'event') {
      eventName = value || 'message';
    } else if (field === 'data') {
      dataLines.push(value);
    } else if (field === 'id') {
      eventId = value;
    }
  }

  if (dataLines.length === 0) return null;
  return {
    event: eventName,
    data: dataLines.join('\n'),
    ...(eventId !== undefined ? { id: eventId } : {}),
  };
}

/**
 * Abre un flujo Server-Sent Events (SSE) hacia `GET /api/v1/notifications/stream` usando
 * `fetch` + `ReadableStream` con cabecera estricta `Authorization: Bearer <token>`.
 * Incluye soporte de heartbeats, renovación automática de JWT ante `401` vía la cola única
 * de `apiClient`, `AbortController` y reconexión con backoff exponencial.
 *
 * @param options Callbacks y parámetros de reconexión del stream.
 * @returns Manejador con `disconnect()` para detener la suscripción sin fugas.
 */
export function connectNotificationsStream(
  options: NotificationsStreamOptions
): NotificationsStreamHandle {
  const initialRetryMs = options.initialRetryMs ?? 1000;
  const maxRetryMs = options.maxRetryMs ?? 30000;

  let disposed = false;
  let retryDelayMs = initialRetryMs;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let activeController: AbortController | null = null;
  let hasAttemptedRefresh = false;

  const scheduleReconnect = () => {
    if (disposed) return;
    if (retryTimer !== null) clearTimeout(retryTimer);
    const waitMs = retryDelayMs;
    retryDelayMs = Math.min(maxRetryMs, retryDelayMs * 2);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void openStream();
    }, waitMs);
  };

  const dispatchFrame = (frame: ParsedSseEvent) => {
    options.onEvent?.(frame);
    if (frame.event !== 'notification' && frame.event !== 'message') return;
    try {
      const parsed = JSON.parse(frame.data) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        const candidate = (parsed.notification as Record<string, unknown> | undefined) ?? parsed;
        if (candidate.title || candidate.message || candidate.id || candidate.type) {
          options.onNotification(normalizeNotification(candidate));
        }
      }
    } catch {
      // Ignorar payloads no-JSON (ej. mensajes informativos de conexión)
    }
  };

  const consumeStream = async (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (!disposed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');

        let boundaryIdx = buffer.indexOf('\n\n');
        while (boundaryIdx !== -1) {
          const rawBlock = buffer.slice(0, boundaryIdx);
          buffer = buffer.slice(boundaryIdx + 2);
          const frame = parseSseBlock(rawBlock);
          if (frame) dispatchFrame(frame);
          boundaryIdx = buffer.indexOf('\n\n');
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const openStream = async (): Promise<void> => {
    if (disposed) return;

    const token = storageService.getToken();
    if (!token) {
      options.onDisconnected?.();
      return;
    }

    const controller = new AbortController();
    activeController = controller;
    const url = apiClient.resolveUrl('/api/v1/notifications/stream');

    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      if (response.status === 401) {
        if (!hasAttemptedRefresh) {
          hasAttemptedRefresh = true;
          try {
            await apiClient.refreshAccessToken();
            if (!disposed) {
              void openStream();
            }
            return;
          } catch (refreshErr) {
            options.onError?.(refreshErr);
            options.onDisconnected?.();
            return;
          }
        }
        options.onDisconnected?.();
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error(`SSE connection rejected with status ${response.status}`);
      }

      retryDelayMs = initialRetryMs;
      hasAttemptedRefresh = false;
      options.onConnected?.();

      await consumeStream(response.body);

      if (!disposed) {
        options.onDisconnected?.();
        scheduleReconnect();
      }
    } catch (err: unknown) {
      if (disposed) return;
      const isAbort = (err as { name?: string })?.name === 'AbortError';
      if (!isAbort) {
        options.onError?.(err);
        options.onDisconnected?.();
        scheduleReconnect();
      }
    } finally {
      if (activeController === controller) {
        activeController = null;
      }
    }
  };

  void openStream();

  return {
    disconnect() {
      disposed = true;
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (activeController) {
        activeController.abort();
        activeController = null;
      }
    },
  };
}
