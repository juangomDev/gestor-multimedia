/**
 * Servicio para la gestión de Formularios Dinámicos, Tablas Abiertas y Resolución Write-Once.
 * @module services/formsService
 */

import { apiClient } from './apiClient';
import { storageService } from './storageService';
import type {
  FormDefinition,
  CreateFormInput,
  FormEntry,
  ListEntriesOptions,
  ResolveEntryInput,
  DispatchResult,
} from '../types/forms';

/**
 * Respuesta estructurada de listado de entradas con paginación.
 */
export interface ListEntriesResponse {
  entries: FormEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Cliente de servicio para interactuar con los endpoints de formularios.
 */
export class FormsService {
  /**
   * Obtiene la lista completa de definiciones de formularios registradas.
   */
  async listForms(): Promise<FormDefinition[]> {
    try {
      const res = await apiClient.get<FormDefinition[] | { data: FormDefinition[]; forms?: FormDefinition[] }>(
        '/api/v1/forms'
      );
      if (Array.isArray(res)) return res;
      return res.data || res.forms || [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Obtiene el detalle de un formulario por su UUID o slug amigable.
   */
  async getForm(idOrSlug: string): Promise<FormDefinition> {
    const res = await apiClient.get<FormDefinition | { data: FormDefinition }>(
      `/api/v1/forms/${idOrSlug}`
    );
    return 'data' in res ? res.data : res;
  }

  /**
   * Registra una nueva definición de formulario dinámico.
   */
  async createForm(input: CreateFormInput): Promise<FormDefinition> {
    const payload = {
      ...input,
      allowedResolutionStates: input.allowedResolutionStates || ['VALID', 'INVALID'],
    };
    const res = await apiClient.post<FormDefinition | { data: FormDefinition; form?: FormDefinition }>(
      '/api/v1/forms',
      payload
    );
    if ('data' in res && res.data) return res.data;
    if ('form' in res && res.form) return res.form;
    return res as FormDefinition;
  }

  /**
   * Obtiene la bandeja de entradas de un formulario con filtros mensuales y por estado.
   */
  async listEntries(formId: string, options?: ListEntriesOptions): Promise<ListEntriesResponse> {
    const params = new URLSearchParams();
    if (options?.month) params.set('month', options.month);
    if (options?.status && options.status !== 'ALL') params.set('status', options.status);
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));

    const qs = params.toString();
    const endpoint = qs ? `/api/v1/forms/${formId}/entries?${qs}` : `/api/v1/forms/${formId}/entries`;

    try {
      const res = await apiClient.get<{
        entries?: FormEntry[];
        data?: FormEntry[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
      } | FormEntry[]>(endpoint);

      if (Array.isArray(res)) {
        return {
          entries: res,
          total: res.length,
          page: 1,
          limit: res.length || 50,
          totalPages: 1,
        };
      }

      const entries = res.entries || res.data || [];
      const total = res.total ?? entries.length;
      const page = res.page ?? options?.page ?? 1;
      const limit = res.limit ?? options?.limit ?? 50;
      const totalPages = res.totalPages ?? Math.max(1, Math.ceil(total / limit));

      return { entries, total, page, limit, totalPages };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        return { entries: [], total: 0, page: 1, limit: 50, totalPages: 1 };
      }
      throw err;
    }
  }

  /**
   * Sella de forma inmutable una entrada asignando dictamen y payload de resolución (Write-Once).
   */
  async resolveEntry(entryId: string, input: ResolveEntryInput): Promise<FormEntry> {
    const res = await apiClient.patch<FormEntry | { data: FormEntry; entry?: FormEntry }>(
      `/api/v1/forms/entries/${entryId}/resolve`,
      input
    );
    if ('data' in res && res.data) return res.data;
    if ('entry' in res && res.entry) return res.entry;
    return res as FormEntry;
  }

  /**
   * Despacha a demanda una entrada resuelta hacia el webhook configurado en `externalTargetUrl`.
   */
  async dispatchEntry(entryId: string): Promise<DispatchResult> {
    const res = await apiClient.post<DispatchResult | { data: DispatchResult }>(
      `/api/v1/forms/entries/${entryId}/dispatch`,
      {}
    );
    return 'data' in res ? res.data : res;
  }

  /**
   * Construye la URL para descargar la exportación de entradas en formato Excel o CSV.
   */
  getExportUrl(
    formId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
    options?: { month?: string; status?: string }
  ): string {
    const base = storageService.getConfig().baseUrl.replace(/\/+$/, '');
    const params = new URLSearchParams();
    params.set('format', format);
    if (options?.month) params.set('month', options.month);
    if (options?.status && options.status !== 'ALL') params.set('status', options.status);

    return `${base}/api/v1/forms/${formId}/export?${params.toString()}`;
  }

  /**
   * Envía una entrada pública utilizando el slug del formulario sin requerir token JWT.
   */
  async submitPublicEntry(
    slug: string,
    payload: Record<string, unknown>
  ): Promise<{ id: string; status: string; createdAt: string }> {
    const res = await apiClient.post<{
      id: string;
      status: string;
      createdAt: string;
      data?: { id: string; status: string; createdAt: string };
    }>(`/api/v1/public/forms/${slug}/entries`, payload);

    return res.data || res;
  }
}

/**
 * Instancia singleton exportada para interactuar con el servicio de Formularios.
 */
export const formsService = new FormsService();

