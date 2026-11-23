import { buildPublicAssetUrl } from '../../utils/formatters';
import type { TableDataQueryOptions } from '../../types/api';

/**
 * Parámetros reservados del endpoint `GET /t/:short_code` que no deben ser
 * sobreescritos por filtros dinámicos de columna.
 */
const RESERVED_TABLE_QUERY_PARAMS = new Set([
  'page',
  'limit',
  'search',
  'select',
  'format',
  'includeStyles',
  'download',
  'raw',
]);

/**
 * Normaliza la lista de columnas seleccionadas (`?select=col1,col2`) hacia una cadena limpia.
 *
 * @param select Cadena separada por comas o arreglo de nombres de columna.
 * @returns Lista separada por comas sin espacios vacíos o `undefined` si no hay selección.
 */
export function normalizeSelectColumns(select?: string | string[]): string | undefined {
  if (!select) return undefined;
  const parts = (Array.isArray(select) ? select : select.split(','))
    .map((col) => col.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(',') : undefined;
}

/**
 * Comprueba si un objeto de opciones de consulta tabular contiene algún filtro activo
 * (`search`, `select`, `format`, `includeStyles` o `filters` por columna).
 *
 * @param options Opciones de filtrado server-side.
 * @returns `true` cuando existe al menos un criterio activo.
 */
export function hasActiveTableQueryFilters(
  options?: Omit<TableDataQueryOptions, 'page' | 'limit'>
): boolean {
  if (!options) return false;
  if (options.search && options.search.trim()) return true;
  if (normalizeSelectColumns(options.select)) return true;
  if (options.format) return true;
  if (options.includeStyles !== undefined) return true;
  if (options.filters) {
    for (const [key, val] of Object.entries(options.filters)) {
      if (!key.trim() || RESERVED_TABLE_QUERY_PARAMS.has(key.trim())) continue;
      if (val === null || (val !== undefined && String(val).trim() !== '')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Construye los parámetros `URLSearchParams` para `GET /t/:short_code` combinando
 * paginación, `?search=`, `?select=`, `?format=`, `?includeStyles=` y filtros dinámicos por columna o alias.
 *
 * @param options Opciones completas de consulta tabular.
 * @returns Instancia `URLSearchParams` lista para serializar.
 */
export function buildTableQuerySearchParams(options: TableDataQueryOptions = {}): URLSearchParams {
  const params = new URLSearchParams();

  if (options.page !== undefined) {
    params.set('page', String(Math.max(1, options.page)));
  }
  if (options.limit !== undefined) {
    params.set('limit', String(Math.min(500, Math.max(1, options.limit))));
  }
  if (options.search && options.search.trim()) {
    params.set('search', options.search.trim());
  }

  const normalizedSelect = normalizeSelectColumns(options.select);
  if (normalizedSelect) {
    params.set('select', normalizedSelect);
  }

  if (options.includeStyles) {
    params.set('includeStyles', 'true');
  }

  if (options.filters) {
    for (const [rawKey, rawVal] of Object.entries(options.filters)) {
      const key = rawKey.trim();
      if (!key || RESERVED_TABLE_QUERY_PARAMS.has(key)) continue;
      if (rawVal === null) {
        params.set(key, 'null');
      } else if (rawVal !== undefined && String(rawVal).trim() !== '') {
        params.set(key, String(rawVal).trim());
      }
    }
  }

  if (options.format) {
    params.set('format', options.format);
  }

  return params;
}

/**
 * Construye la ruta relativa `/t/:shortCode?...` o la URL pública absoluta para `GET /t/:short_code`.
 *
 * @param shortCode Código corto de la tabla.
 * @param options Opciones de filtrado, proyección y formato.
 * @param baseUrl URL base opcional; si se proporciona, devuelve la URL absoluta.
 * @returns Ruta relativa o URL absoluta con query string codificado.
 */
export function buildTableEndpointUrl(
  shortCode: string,
  options: TableDataQueryOptions = {},
  baseUrl?: string
): string {
  const basePath = baseUrl
    ? buildPublicAssetUrl(baseUrl, 't', shortCode)
    : `/t/${encodeURIComponent(shortCode)}`;
  const qs = buildTableQuerySearchParams(options).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
