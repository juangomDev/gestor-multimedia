import { storageService } from './storageService';
import { cleanBaseUrl } from '../utils/formatters';
import {
  ApiError,
  buildApiErrorFromResponse,
  extractFilenameFromDisposition,
  type InvalidParam,
  type ProblemDetails,
  type RequestOptions,
  type DownloadResult,
} from './http/apiError';
import {
  buildRequestHeaders,
  parseSuccessResponse,
  normalizeTransportError,
} from './http/httpHelpers';
import { TokenRefreshQueue } from './http/tokenRefreshQueue';

export {
  ApiError,
  type InvalidParam,
  type ProblemDetails,
  type RequestOptions,
  type DownloadResult,
};

/**
 * Crea un `AbortController` combinado que respeta tanto el timeout interno como una
 * `AbortSignal` externa opcional, distinguiendo qué fuente disparó la cancelación.
 */
function createLinkedAbortController(timeoutMs: number, externalSignal?: AbortSignal | null) {
  const controller = new AbortController();
  let externalAborted = false;

  const onExternalAbort = () => {
    externalAborted = true;
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      onExternalAbort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    wasExternalAbort: () => externalAborted,
    cleanup: () => {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    },
  };
}

/**
 * Cliente HTTP centralizado y sin estado para comunicación con `monolith-backend`.
 * Envía estrictamente `Authorization: Bearer <token>` con `credentials: 'include'`,
 * decodifica errores RFC 7807 y gestiona rotación única de tokens JWT ante `401`.
 */
export class ApiClient {
  private refreshQueue = new TokenRefreshQueue();

  /** Suscribe un listener notificado cuando la sesión expira definitivamente. */
  public onUnauthorized(listener: () => void): () => void {
    return this.refreshQueue.onUnauthorized(listener);
  }

  /** Suscribe un listener notificado cuando un refresco `401` rota el access token JWT. */
  public onTokenRefreshed(listener: (token: string) => void): () => void {
    return this.refreshQueue.onTokenRefreshed(listener);
  }

  /** Resuelve una ruta relativa contra el `baseUrl` configurado en `storageService`. */
  public resolveUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const base = cleanBaseUrl(storageService.getApiBaseUrl());
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  /** Solicita la renovación del access token JWT compartiendo la cola única de refresco. */
  public async refreshAccessToken(): Promise<string> {
    return this.refreshQueue.refreshToken(this.resolveUrl('/api/v1/auth/refresh'));
  }

  /**
   * Verifica si la ruta corresponde a un endpoint de autenticación excluido del reintento 401
   * (incluyendo cambio de contraseña actual incorrecta).
   */
  private isAuthRoute(path: string): boolean {
    return (
      path.includes('/api/v1/auth/login') ||
      path.includes('/api/v1/auth/refresh') ||
      path.includes('/api/v1/auth/logout') ||
      path.includes('/api/v1/auth/password')
    );
  }

  /**
   * Ejecuta una petición HTTP genérica con timeout, señal enlazada, RFC 7807 y cola de refresh 401.
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = buildRequestHeaders(options, isFormData);
    const requestToken = storageService.getToken();

    const {
      skipAuth: _skipAuth,
      timeoutMs: customTimeoutMs,
      responseType: _responseType,
      _retry,
      signal: externalSignal,
      credentials,
      ...fetchInit
    } = options;

    const defaultTimeoutMs = path.includes('/chat/ask') || isFormData ? 60_000 : 15_000;
    const timeoutMs = customTimeoutMs || defaultTimeoutMs;
    const abortCtrl = createLinkedAbortController(timeoutMs, externalSignal);

    try {
      const response = await fetch(url, {
        ...fetchInit,
        credentials: credentials ?? 'include',
        headers,
        signal: abortCtrl.signal,
      });

      if (!response.ok) {
        const apiError = await buildApiErrorFromResponse(
          response,
          'HTTP_ERROR',
          'Error del servidor'
        );

        if (
          response.status === 401 &&
          !options.skipAuth &&
          !_retry &&
          !this.isAuthRoute(path)
        ) {
          const latestToken = storageService.getToken();
          if (latestToken && requestToken && latestToken !== requestToken) {
            return this.request<T>(path, { ...options, _retry: true });
          }
          return this.refreshQueue.handleTokenRefresh<T>(
            this.resolveUrl('/api/v1/auth/refresh'),
            () => this.request<T>(path, { ...options, _retry: true }),
            apiError
          );
        }

        throw apiError;
      }

      return await parseSuccessResponse<T>(response, options);
    } catch (err: unknown) {
      throw normalizeTransportError(
        err,
        `La solicitud al servidor excedió el tiempo límite (${Math.round(timeoutMs / 1000)}s)`,
        'Error de conexión con el backend',
        abortCtrl.wasExternalAbort()
      );
    } finally {
      abortCtrl.cleanup();
    }
  }

  /** Realiza una petición HTTP `GET`. */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /** Realiza una petición HTTP `POST` soportando JSON o `FormData`. */
  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const payload = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(path, { ...options, method: 'POST', body: payload });
  }

  /** Realiza una petición HTTP `PUT` soportando JSON o `FormData`. */
  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const payload = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(path, { ...options, method: 'PUT', body: payload });
  }

  /** Realiza una petición HTTP `PATCH` soportando JSON o `FormData`. */
  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const payload = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(path, { ...options, method: 'PATCH', body: payload });
  }

  /** Realiza una petición HTTP `DELETE` sin cabecera `Content-Type` vacía. */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Descarga un recurso binario extrayendo el nombre de archivo desde `Content-Disposition`,
   * enviando credenciales Bearer y renovando el token automáticamente ante `401`.
   */
  async download(
    path: string,
    defaultFilename = 'download',
    options: RequestOptions = {}
  ): Promise<DownloadResult> {
    const url = this.resolveUrl(path);
    const headers = buildRequestHeaders(options);
    const requestToken = storageService.getToken();

    const {
      skipAuth: _skipAuth,
      timeoutMs: customTimeoutMs,
      responseType: _responseType,
      _retry,
      signal: externalSignal,
      credentials,
      ...fetchInit
    } = options;

    const timeoutMs = customTimeoutMs || 30_000;
    const abortCtrl = createLinkedAbortController(timeoutMs, externalSignal);

    try {
      const response = await fetch(url, {
        ...fetchInit,
        credentials: credentials ?? 'include',
        headers,
        signal: abortCtrl.signal,
      });

      if (!response.ok) {
        const apiError = await buildApiErrorFromResponse(
          response,
          'DOWNLOAD_ERROR',
          'Error al descargar'
        );

        if (
          response.status === 401 &&
          !options.skipAuth &&
          !_retry &&
          !this.isAuthRoute(path)
        ) {
          const latestToken = storageService.getToken();
          if (latestToken && requestToken && latestToken !== requestToken) {
            return this.download(path, defaultFilename, { ...options, _retry: true });
          }
          return this.refreshQueue.handleTokenRefresh<DownloadResult>(
            this.resolveUrl('/api/v1/auth/refresh'),
            () => this.download(path, defaultFilename, { ...options, _retry: true }),
            apiError
          );
        }

        throw apiError;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      const filename = extractFilenameFromDisposition(contentDisposition, defaultFilename);
      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      return { blob, filename, contentType, sizeBytes: blob.size };
    } catch (err: unknown) {
      throw normalizeTransportError(
        err,
        `La descarga excedió el tiempo límite (${Math.round(timeoutMs / 1000)}s)`,
        'Error al conectar para descargar el archivo',
        abortCtrl.wasExternalAbort()
      );
    } finally {
      abortCtrl.cleanup();
    }
  }
}

/** Instancia singleton del cliente HTTP hacia `monolith-backend`. */
export const apiClient = new ApiClient();
