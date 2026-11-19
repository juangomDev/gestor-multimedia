import { cleanBaseUrl } from '../../utils/formatters';
import { ApiError } from '../../services/http/apiError';
import type { FormEntry, FormSchemaField } from '../../types/forms';

/**
 * Convierte un título humano en un slug público válido (`a-z`, `0-9`, `-`).
 */
export function slugifyTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Genera una clave de campo JSON limpia (`snake_case`) a partir de una etiqueta.
 */
export function fieldKeyFromLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

/**
 * Construye el endpoint público de envío de entradas (`POST /api/v1/public/forms/:slug/entries`).
 */
export function buildPublicFormEndpoint(baseUrl: string, slug: string): string {
  return `${cleanBaseUrl(baseUrl)}/api/v1/public/forms/${encodeURIComponent(slug)}/entries`;
}

/**
 * Genera un ejemplo de valor acorde al tipo de campo del esquema para el snippet de integración.
 */
function sampleValueForField(field: FormSchemaField): unknown {
  if (field.type === 'number') return 100;
  if (field.type === 'boolean') return true;
  if (field.type === 'date') return '2026-05-15';
  if (field.type === 'email') return 'contacto@ejemplo.com';
  if (field.type === 'select') return field.options?.[0] || 'opcion_1';
  return field.placeholder || `Valor de ${field.label || field.name}`;
}

/**
 * Genera un snippet `fetch` listo para copiar e incrustar en sitios web externos.
 */
export function buildPublicFetchSnippet(
  baseUrl: string,
  slug: string,
  entryFieldsSchema: FormSchemaField[]
): string {
  const endpoint = buildPublicFormEndpoint(baseUrl, slug);
  const samplePayload: Record<string, unknown> = {};
  for (const field of entryFieldsSchema) {
    if (field.name) {
      samplePayload[field.name] = sampleValueForField(field);
    }
  }
  const formattedBody = JSON.stringify(samplePayload, null, 2);

  return `const response = await fetch('${endpoint}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${formattedBody}),
});

if (!response.ok) {
  throw new Error('Error al enviar el formulario');
}

const created = await response.json();
console.log('Entrada registrada:', created);`;
}

/**
 * Formatea un valor arbitrario del payload de una entrada o dictamen para visualización legible.
 */
export function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Detecta explícitamente el conflicto Write-Once `409 ENTRY_ALREADY_RESOLVED` devuelto por el servidor.
 */
export function isEntryAlreadyResolvedError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 409 || err.code === 'ENTRY_ALREADY_RESOLVED';
  }
  if (err && typeof err === 'object') {
    const candidate = err as { status?: number; code?: string };
    return candidate.status === 409 || candidate.code === 'ENTRY_ALREADY_RESOLVED';
  }
  return false;
}

/**
 * Dispara la descarga en el navegador de un `Blob` previamente obtenido mediante descarga autenticada.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Conteo desglosado por estado (`NEW`, `VALID`, `INVALID`) de un conjunto de entradas.
 */
export interface FormStatusBreakdown {
  total: number;
  NEW: number;
  VALID: number;
  INVALID: number;
}

/**
 * Calcula el desglose numérico por estado para los indicadores superiores de la bandeja.
 */
export function countEntryStatuses(entries: FormEntry[]): FormStatusBreakdown {
  const counts: FormStatusBreakdown = { total: entries.length, NEW: 0, VALID: 0, INVALID: 0 };
  for (const entry of entries) {
    if (entry.status === 'NEW') counts.NEW += 1;
    else if (entry.status === 'VALID') counts.VALID += 1;
    else if (entry.status === 'INVALID') counts.INVALID += 1;
  }
  return counts;
}
