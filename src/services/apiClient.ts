import { storageService, DEFAULT_CONFIG } from './storageService';
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
import { TokenRefreshQueue } from './http/tokenRefreshQueue';

export {
  ApiError,
  type InvalidParam,
  type ProblemDetails,
  type RequestOptions,
  type DownloadResult,
};

/**
 * Cliente HTTP centralizado para comunicación con `monolith-backend`.
 * Incluye inyección de credenciales, soporte RFC 7807 y rotación transparente de tokens JWT (`401`).
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
   * Construye las cabeceras HTTP de autenticación y tipo de contenido.
   */
  private getHeaders(options?: RequestOptions, isFormData: boolean = false): Headers {
    const headers = new Headers(options?.headers);
    const config = storageService.getConfig();
    const token = storageService.getToken();

    if (!options?.skipAuth) {
      const isDevFallbackToken = Boolean(token && token.startsWith('dev_'));
      if (token && !isDevFallbackToken) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (
        config.apiKey &&
        (!token || isDevFallbackToken || config.apiKey !== DEFAULT_CONFIG.apiKey)
      ) {
        headers.set('X-API-Key', config.apiKey);
      }
    }

    if (isFormData) {
      headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  /**
   * Resuelve una ruta relativa contra el `baseUrl` configurado en el cliente.
   */
  private resolveUrl(path: string): string {
    const base = cleanBaseUrl(storageService.getConfig().baseUrl);
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  /**
   * Verifica si la ruta corresponde a un endpoint de autenticación o si la sesión es local/demo.
   */
  private isAuthRoute(path: string): boolean {
    const token = storageService.getToken();
    const isDemoToken = Boolean(token && (token.startsWith('dev_') || token.startsWith('mock-')));
    return (
      isDemoToken ||
      path.includes('/api/v1/auth/login') ||
      path.includes('/api/v1/auth/refresh')
    );
  }

  /**
   * Ejecuta una petición HTTP genérica con timeout, decodificación RFC 7807 y reintento 401.
   *
   * @param path Ruta relativa del endpoint (ej. `/api/v1/images`).
   * @param options Opciones de configuración de la petición.
   * @returns Promesa con la respuesta tipada `T`.
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = this.getHeaders(options, isFormData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

    try {
      const response = await fetch(url, {
        credentials: options.credentials || 'include',
        ...options,
        headers,
        signal: controller.signal,
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

      if (response.status === 204) {
        return undefined as T;
      }

      if (options.responseType === 'blob') {
        return (await response.blob()) as unknown as T;
      }
      if (options.responseType === 'arrayBuffer') {
        return (await response.arrayBuffer()) as unknown as T;
      }
      if (options.responseType === 'text') {
        return (await response.text()) as unknown as T;
      }

      const contentType = response.headers.get('content-type') || '';
      if (
        contentType.includes('application/json') ||
        contentType.includes('application/problem+json')
      ) {
        return (await response.json()) as T;
      }

      return (await response.text()) as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new ApiError(
          408,
          'TIMEOUT',
          'La solicitud al servidor excedió el tiempo límite (15s)'
        );
      }
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(0, 'NETWORK_ERROR', err.message || 'Error de conexión con el backend');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Realiza una petición HTTP `GET`.
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * Realiza una petición HTTP `POST` soportando JSON o `FormData`.
   */
  async post<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const payload = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(path, { ...options, method: 'POST', body: payload });
  }

  /**
   * Realiza una petición HTTP `PUT` soportando JSON o `FormData`.
   */
  async put<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const payload = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(path, { ...options, method: 'PUT', body: payload });
  }

  /**
   * Realiza una petición HTTP `PATCH` soportando JSON o `FormData`.
   */
  async patch<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const payload = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(path, { ...options, method: 'PATCH', body: payload });
  }

  /**
   * Realiza una petición HTTP `DELETE`.
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Descarga un recurso binario extrayendo el nombre de archivo de `Content-Disposition`,
   * incluyendo credenciales y soporte de renovación automática ante respuestas `401`.
   *
   * @param path Ruta del recurso a descargar.
   * @param defaultFilename Nombre de archivo de respaldo.
   * @param options Opciones adicionales de la solicitud.
   * @returns Promesa con el `Blob` y metadatos del archivo descargado.
   */
  async download(
    path: string,
    defaultFilename = 'download',
    options: RequestOptions = {}
  ): Promise<DownloadResult> {
    const url = this.resolveUrl(path);
    const headers = this.getHeaders(options);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 30000);

    try {
      const response = await fetch(url, {
        credentials: options.credentials || 'include',
        ...options,
        headers,
        signal: controller.signal,
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

      return {
        blob,
        filename,
        contentType,
        sizeBytes: blob.size,
      };
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      if (err.name === 'AbortError') {
        throw new ApiError(408, 'TIMEOUT', 'La descarga excedió el tiempo límite (30s)');
      }
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        err.message || 'Error al conectar para descargar el archivo'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const apiClient = new ApiClient();
