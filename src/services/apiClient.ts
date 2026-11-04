import { storageService } from './storageService';
import { cleanBaseUrl } from '../utils/formatters';

export interface InvalidParam {
  name: string;
  reason: string;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  instance?: string;
  invalidParams?: InvalidParam[];
}

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  timeoutMs?: number;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
}

export interface DownloadResult {
  blob: Blob;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export class ApiError extends Error {
  status: number;
  code: string;
  detail: string;
  title?: string;
  type?: string;
  instance?: string;
  invalidParams?: InvalidParam[];
  details?: any;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: any,
    options?: {
      title?: string;
      type?: string;
      instance?: string;
      invalidParams?: InvalidParam[];
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = message;
    this.details = details;
    this.title = options?.title;
    this.type = options?.type;
    this.instance = options?.instance;
    this.invalidParams = options?.invalidParams;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ApiClient {
  private getHeaders(options?: RequestOptions, isFormData: boolean = false): Headers {
    const headers = new Headers(options?.headers);
    const config = storageService.getConfig();
    const token = storageService.getToken();

    if (!options?.skipAuth) {
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (config.apiKey) {
        headers.set('X-API-Key', config.apiKey);
      }
    }

    if (isFormData) {
      // Los navegadores calculan automáticamente el Content-Type multipart con boundary
      headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  private resolveUrl(path: string): string {
    const base = cleanBaseUrl(storageService.getConfig().baseUrl);
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  private extractFilename(contentDisposition: string | null, fallback: string): string {
    if (!contentDisposition) return fallback;
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        return utf8Match[1];
      }
    }
    const standardMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (standardMatch?.[1]) {
      return standardMatch[1];
    }
    return fallback;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = this.getHeaders(options, isFormData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errData: any = {};
        try {
          errData = await response.json();
        } catch {
          errData = { message: `Error HTTP ${response.status}: ${response.statusText}` };
        }

        const detail = errData.detail || errData.message || `Error del servidor (${response.status})`;
        const code = errData.code || errData.error || 'HTTP_ERROR';

        throw new ApiError(
          response.status,
          code,
          detail,
          errData.details || errData.invalidParams,
          {
            title: errData.title,
            type: errData.type,
            instance: errData.instance,
            invalidParams: errData.invalidParams,
          }
        );
      }

      // Si es 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      // Tipos de respuesta explícitos
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
      if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
        return (await response.json()) as T;
      }

      return (await response.text()) as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new ApiError(408, 'TIMEOUT', 'La solicitud al servidor excedió el tiempo límite (15s)');
      }
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(0, 'NETWORK_ERROR', err.message || 'Error de conexión con el backend');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  async put<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  async patch<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  async download(path: string, defaultFilename = 'download', options?: RequestOptions): Promise<DownloadResult> {
    const url = this.resolveUrl(path);
    const headers = this.getHeaders(options);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeoutMs || 30000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errData: any = {};
        try {
          errData = await response.json();
        } catch {
          errData = { message: `Error HTTP ${response.status}: ${response.statusText}` };
        }
        const detail = errData.detail || errData.message || `Error al descargar (${response.status})`;
        const code = errData.code || errData.error || 'DOWNLOAD_ERROR';
        throw new ApiError(response.status, code, detail, errData.details, {
          title: errData.title,
          type: errData.type,
          instance: errData.instance,
          invalidParams: errData.invalidParams,
        });
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      const filename = this.extractFilename(contentDisposition, defaultFilename);
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
      throw new ApiError(0, 'NETWORK_ERROR', err.message || 'Error al conectar para descargar el archivo');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const apiClient = new ApiClient();
