import { apiClient, ApiError } from './apiClient';
import { storageService } from './storageService';
import { cleanBaseUrl } from '../utils/formatters';
import type { HealthResponse } from '../types/api';

/**
 * Servicio de diagnóstico del backend: salud (`GET /health`) y documentación OpenAPI
 * (`GET /docs`, `GET /openapi.json`).
 */
export class HealthService {
  /**
   * Consulta `GET /health` midiendo la latencia de ida y vuelta.
   * Normaliza el alias `database` hacia `db`, preserva `uptime` y recupera el cuerpo JSON
   * real cuando el backend responde `503 Service Unavailable` con diagnóstico parcial.
   *
   * @returns Estado de salud; si la red falla devuelve un estado `degraded`.
   */
  async checkHealth(): Promise<HealthResponse> {
    const start = performance.now();
    try {
      const res = await apiClient.get<HealthResponse>('/health', {
        skipAuth: true,
        timeoutMs: 5000,
      });
      const latencyMs = Math.round(performance.now() - start);
      return {
        ...res,
        db: res.database ?? res.db,
        latencyMs,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      if (err instanceof ApiError && err.status === 503 && err.details && typeof err.details === 'object') {
        const raw = err.details as Partial<HealthResponse>;
        return {
          status: raw.status === 'ok' ? 'ok' : 'degraded',
          db: raw.database ?? raw.db ?? 'down',
          storage: raw.storage ?? 'unwritable',
          timestamp: raw.timestamp || new Date().toISOString(),
          uptime: typeof raw.uptime === 'number' ? raw.uptime : undefined,
          latencyMs,
        };
      }
      return {
        status: 'degraded',
        db: 'down',
        storage: 'unwritable',
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      };
    }
  }

  /**
   * Construye la URL absoluta de la consola interactiva Scalar (`/docs`) del backend configurado.
   * @returns URL completa hacia `/docs`.
   */
  getDocsUrl(): string {
    return `${cleanBaseUrl(storageService.getConfig().baseUrl)}/docs`;
  }

  /**
   * Construye la URL absoluta de la especificación cruda OpenAPI (`/openapi.json`).
   * @returns URL completa hacia `/openapi.json`.
   */
  getOpenApiUrl(): string {
    return `${cleanBaseUrl(storageService.getConfig().baseUrl)}/openapi.json`;
  }

  /**
   * Descarga la especificación OpenAPI cruda desde `GET /openapi.json`.
   * @returns Documento OpenAPI parseado como objeto JSON.
   */
  async fetchOpenApiSpec(): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>('/openapi.json', {
      skipAuth: true,
      timeoutMs: 10000,
    });
  }
}

export const healthService = new HealthService();
