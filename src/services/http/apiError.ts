/**
 * Detalle de parámetro inválido según extensión de validación RFC 7807.
 */
export interface InvalidParam {
  name: string;
  reason: string;
}

/**
 * Estructura estándar RFC 7807 Problem Details devuelta por monolith-backend.
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  instance?: string;
  invalidParams?: InvalidParam[];
}

/**
 * Opciones extendidas para peticiones HTTP del ApiClient.
 */
export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  timeoutMs?: number;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
  _retry?: boolean;
}

/**
 * Resultado estructurado de una descarga binaria con metadatos extraídos de cabeceras.
 */
export interface DownloadResult {
  blob: Blob;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Error tipado de transporte HTTP compatible con RFC 7807 Problem Details.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  detail: string;
  title?: string;
  type?: string;
  instance?: string;
  invalidParams?: InvalidParam[];
  details?: any;

  /**
   * Crea una instancia de ApiError con soporte completo para campos RFC 7807.
   */
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

/**
 * Construye un `ApiError` decodificando el cuerpo JSON/ProblemDetails de una respuesta HTTP fallida.
 *
 * @param response Respuesta HTTP con `!response.ok`.
 * @param defaultCode Código de error por defecto si el servidor no provee uno.
 * @param defaultMessagePrefix Prefijo del mensaje de respaldo.
 * @returns Instancia enriquecida de `ApiError`.
 */
export async function buildApiErrorFromResponse(
  response: Response,
  defaultCode: string = 'HTTP_ERROR',
  defaultMessagePrefix: string = 'Error del servidor'
): Promise<ApiError> {
  let errData: any = {};
  try {
    errData = await response.json();
  } catch {
    errData = { message: `Error HTTP ${response.status}: ${response.statusText}` };
  }

  const detail =
    errData.detail || errData.message || `${defaultMessagePrefix} (${response.status})`;
  const code = errData.code || errData.error || defaultCode;

  return new ApiError(
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

/**
 * Extrae el nombre de archivo desde la cabecera `Content-Disposition` soportando UTF-8 (RFC 5987).
 *
 * @param contentDisposition Valor de la cabecera `Content-Disposition`.
 * @param fallback Nombre de archivo por defecto si no se encuentra en la cabecera.
 * @returns Nombre de archivo decodificado.
 */
export function extractFilenameFromDisposition(
  contentDisposition: string | null,
  fallback: string
): string {
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

