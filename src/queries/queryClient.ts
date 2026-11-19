import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/apiClient';

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 409, 422, 429]);

/**
 * Determina si TanStack Query debe reintentar una consulta fallida.
 * Nunca reintenta errores deterministas del cliente (`400`, `401`, `403`, `404`, `409`, `422`, `429`).
 *
 * @param failureCount Número de intentos fallidos previos.
 * @param error Error lanzado por el servicio HTTP.
 * @returns `true` si corresponde realizar un único reintento ante fallos transitorios.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && NON_RETRYABLE_STATUSES.has(error.status)) {
    return false;
  }
  return failureCount < 1;
}

/**
 * Crea una instancia configurada de `QueryClient` para Gestor Multimedia v2
 * (sin reintentos ante errores 4xx, caché fresca de 30s y retención de 5 min).
 *
 * @returns Nueva instancia de `QueryClient`.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/** Instancia singleton de `QueryClient` compartida por la aplicación. */
export const appQueryClient = createAppQueryClient();
