import { storageService } from './storageService';
import { cleanBaseUrl } from '../utils/formatters';

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
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

    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  private resolveUrl(path: string): string {
    const base = cleanBaseUrl(storageService.getConfig().baseUrl);
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
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

        throw new ApiError(
          response.status,
          errData.error || errData.code || 'HTTP_ERROR',
          errData.message || `Error del servidor (${response.status})`,
          errData.details
        );
      }

      // If 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
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
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
