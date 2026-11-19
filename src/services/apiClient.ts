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
 * Cliente HTTP centralizado y sin estado para comunicación con `monolith-backend`.
 * Envía estrictamente `Authorization: Bearer <token>` con `credentials: 'include'`,
 * decodifica errores RFC 7807 y gestiona rotación única de tokens JWT ante `401`.
 */
export class ApiClient {
  private refreshQueue = new TokenRefreshQueue();

  /**
   * Suscribe un listener para ser notificado cuando la sesión expira definitivamente.
   */
  public onUnauthorized(listener: () => void): () => void {
    return this.refreshQueue.onUnauthorized(listener);
  }

  /**
   * Resuelve una ruta relativa contra el `baseUrl` configurado en `storageService`.
   */
  public resolveUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const base = cleanBaseUrl(storageService.getApiBaseUrl());
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  /**
   * Solicita la renovación del access token JWT compartiendo la cola única de refresco.
   */
  public async refreshAccessToken(): Promise<string> {
    return this.refreshQueue.refreshToken(this.resolveUrl('/api/v1/auth/refresh'));
  }

  /**
   * Verifica si la ruta corresponde a un endpoint de autenticación excluido del reintento 401.
   */
  private isAuthRoute(path: string): boolean {
    return (
      path.includes('/api/v1/auth/login') ||
      path.includes('/api/v1/auth/refresh') ||
      path.includes('/api/v1/auth/logout')
    );
  }

  /**
   * Ejecuta una petición HTTP genérica con timeout, decodificación RFC 7807 y cola de refresh 401.
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = buildRequestHeaders(options, isFormData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

    try {
      const response = await fetch(url, {
        credentials: options.credentials || 'include',
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
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
          !options._retry &&
          !this.isAuthRoute(path)
        ) {
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
        'La solicitud al servidor excedió el tiempo límite (15s)',
        'Error de conexión con el backend'
      );
    } finally {
      clearTimeout(timeoutId);
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 30000);

    try {
      const response = await fetch(url, {
        credentials: options.credentials || 'include',
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
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
          !options._retry &&
          !this.isAuthRoute(path)
        ) {
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
        'La descarga excedió el tiempo límite (30s)',
        'Error al conectar para descargar el archivo'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/** Instancia singleton del cliente HTTP hacia `monolith-backend`. */
export const apiClient = new ApiClient();
