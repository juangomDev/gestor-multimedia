import { storageService } from '../storageService';
import { ApiError, type RequestOptions } from './apiError';

/**
 * Construye las cabeceras HTTP de autenticación Bearer y tipo de contenido.
 * No inyecta `X-API-Key` por defecto y omite `Content-Type` en `FormData`
 * o en peticiones `DELETE` sin cuerpo.
 *
 * @param options Opciones de la solicitud HTTP.
 * @param isFormData Indica si el cuerpo es una instancia de `FormData`.
 * @returns Instancia de `Headers` lista para `fetch`.
 */
export function buildRequestHeaders(
  options?: RequestOptions,
  isFormData: boolean = false
): Headers {
  const headers = new Headers(options?.headers);
  const token = storageService.getToken();

  if (!options?.skipAuth && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (isFormData || options?.body === undefined) {
    headers.delete('Content-Type');
  } else if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

/**
 * Decodifica el cuerpo de una respuesta HTTP exitosa según `responseType` y `Content-Type`.
 *
 * @param response Respuesta HTTP con `response.ok === true`.
 * @param options Opciones de decodificación solicitadas.
 * @returns Valor decodificado tipado `T`.
 */
export async function parseSuccessResponse<T>(
  response: Response,
  options: RequestOptions
): Promise<T> {
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
    if (typeof response.text === 'function') {
      const rawText = await response.text();
      return (rawText.trim() ? JSON.parse(rawText) : undefined) as T;
    }
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

/**
 * Normaliza errores de red, cancelación externa o timeout capturados durante `fetch` hacia `ApiError`.
 *
 * @param err Excepción capturada.
 * @param timeoutMessage Mensaje descriptivo si la operación expiró por timeout interno.
 * @param networkFallback Mensaje de respaldo ante fallo de conexión.
 * @param wasExternalAbort Indica si la cancelación provino de una `AbortSignal` externa.
 */
export function normalizeTransportError(
  err: unknown,
  timeoutMessage: string,
  networkFallback: string,
  wasExternalAbort: boolean = false
): ApiError {
  if (err instanceof ApiError) return err;
  const errorObj = err as { name?: string; message?: string };
  if (errorObj?.name === 'AbortError') {
    if (wasExternalAbort) {
      return new ApiError(0, 'ABORTED', 'Solicitud cancelada');
    }
    return new ApiError(408, 'TIMEOUT', timeoutMessage);
  }
  return new ApiError(0, 'NETWORK_ERROR', errorObj?.message || networkFallback);
}
