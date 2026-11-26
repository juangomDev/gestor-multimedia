import { apiClient, type DownloadResult } from './apiClient';
import type {
  FormDefinition,
  CreateFormInput,
  UpdateFormInput,
  DeleteFormResult,
  FetchFormsOptions,
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
 * Cliente HTTP sin estado para interactuar con los endpoints de Formularios Dinámicos
 * y Resolución Write-Once en `monolith-backend`.
 */
export class FormsService {
  /**
   * Obtiene la lista de definiciones de formularios registradas (`GET /api/v1/forms`),
   * soportando filtrado opcional por carpeta, búsqueda y paginación.
   *
   * @param options Parámetros opcionales de consulta (`folderId`, `search`, `page`, `limit`).
   * @returns Definiciones de formularios accesibles.
   */
  async listForms(options?: FetchFormsOptions): Promise<FormDefinition[]> {
    const params = new URLSearchParams();
    if (options?.folderId) params.set('folderId', options.folderId);
    if (options?.search && options.search.trim()) params.set('search', options.search.trim());
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.limit !== undefined) params.set('limit', String(options.limit));

    const qs = params.toString();
    const endpoint = qs ? `/api/v1/forms?${qs}` : '/api/v1/forms';

    const res = await apiClient.get<
      FormDefinition[] | { data?: FormDefinition[]; forms?: FormDefinition[] }
    >(endpoint);
    if (Array.isArray(res)) return res;
    return res.data || res.forms || [];
  }

  /**
   * Obtiene el detalle de un formulario por su UUID o slug amigable (`GET /api/v1/forms/:idOrSlug`).
   */
  async getForm(idOrSlug: string): Promise<FormDefinition> {
    const res = await apiClient.get<FormDefinition | { data: FormDefinition; form?: FormDefinition }>(
      `/api/v1/forms/${encodeURIComponent(idOrSlug)}`
    );
    if ('data' in res && res.data) return res.data;
    if ('form' in res && res.form) return res.form;
    return res as FormDefinition;
  }

  /**
   * Registra una nueva definición de formulario dinámico (`POST /api/v1/forms`).
   */
  async createForm(input: CreateFormInput): Promise<FormDefinition> {
    const payload = {
      ...input,
      allowedResolutionStates: input.allowedResolutionStates || ['VALID', 'INVALID'],
    };
    const res = await apiClient.post<
      FormDefinition | { data?: FormDefinition; form?: FormDefinition }
    >('/api/v1/forms', payload);
    if ('data' in res && res.data) return res.data;
    if ('form' in res && res.form) return res.form;
    return res as FormDefinition;
  }

  /**
   * Actualiza la configuración editable de un formulario existente (`PATCH /api/v1/forms/:id`):
   * título, estados permitidos, bandera `autoResolveWithAi` y URL webhook `externalTargetUrl`.
   *
   * @param formId UUID del formulario a actualizar.
   * @param input Campos parciales validados por el contrato OpenAPI.
   * @returns Definición actualizada devuelta por el servidor.
   */
  async updateForm(formId: string, input: UpdateFormInput): Promise<FormDefinition> {
    const res = await apiClient.patch<
      FormDefinition | { data?: FormDefinition; form?: FormDefinition }
    >(`/api/v1/forms/${encodeURIComponent(formId)}`, input);
    if ('data' in res && res.data) return res.data;
    if ('form' in res && res.form) return res.form;
    return res as FormDefinition;
  }

  /**
   * Elimina permanentemente un formulario, sus entradas en cascada y la tabla abierta vinculada
   * junto a su artefacto físico `.data.json.gz` (`DELETE /api/v1/forms/:id`).
   *
   * @param formId UUID del formulario a eliminar.
   * @returns Confirmación `{ deleted, id }`.
   */
  async deleteForm(formId: string): Promise<DeleteFormResult> {
    const res = await apiClient.delete<
      DeleteFormResult | { data?: DeleteFormResult } | undefined
    >(`/api/v1/forms/${encodeURIComponent(formId)}`);
    const payload = res && 'data' in res && res.data ? res.data : (res as DeleteFormResult | undefined);
    return {
      deleted: payload?.deleted ?? true,
      id: payload?.id || formId,
    };
  }

  /**
   * Obtiene la bandeja de entradas de un formulario con filtros mensuales y por estado
   * (`GET /api/v1/forms/:formId/entries`).
   */
  async listEntries(formId: string, options?: ListEntriesOptions): Promise<ListEntriesResponse> {
    const params = new URLSearchParams();
    if (options?.month) params.set('month', options.month);
    if (options?.status && options.status !== 'ALL') params.set('status', options.status);
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));

    const qs = params.toString();
    const endpoint = qs
      ? `/api/v1/forms/${formId}/entries?${qs}`
      : `/api/v1/forms/${formId}/entries`;

    const res = await apiClient.get<
      | {
          entries?: FormEntry[];
          data?: FormEntry[];
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        }
      | FormEntry[]
    >(endpoint);

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
    const totalPages = res.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));

    return { entries, total, page, limit, totalPages };
  }

  /**
   * Sella de forma inmutable una entrada asignando dictamen y payload de resolución Write-Once
   * (`PATCH /api/v1/forms/entries/:entryId/resolve`).
   */
  async resolveEntry(entryId: string, input: ResolveEntryInput): Promise<FormEntry> {
    const res = await apiClient.patch<
      FormEntry | { data?: FormEntry; entry?: FormEntry }
    >(`/api/v1/forms/entries/${entryId}/resolve`, input);
    if ('data' in res && res.data) return res.data;
    if ('entry' in res && res.entry) return res.entry;
    return res as FormEntry;
  }

  /**
   * Despacha a demanda una entrada sellada hacia el webhook configurado en `externalTargetUrl`
   * (`POST /api/v1/forms/entries/:entryId/dispatch`).
   */
  async dispatchEntry(entryId: string): Promise<DispatchResult> {
    const res = await apiClient.post<DispatchResult | { data: DispatchResult }>(
      `/api/v1/forms/entries/${entryId}/dispatch`,
      {}
    );
    return 'data' in res ? res.data : res;
  }

  /**
   * Construye la ruta relativa de exportación para descarga autenticada.
   */
  private buildExportPath(
    formId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
    options?: { month?: string; status?: string }
  ): string {
    const params = new URLSearchParams();
    params.set('format', format);
    if (options?.month) params.set('month', options.month);
    if (options?.status && options.status !== 'ALL') params.set('status', options.status);
    return `/api/v1/forms/${formId}/export?${params.toString()}`;
  }

  /**
   * Descarga con autenticación Bearer la exportación de entradas en formato Excel o CSV
   * (`GET /api/v1/forms/:formId/export`).
   */
  async downloadExport(
    formId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
    options?: { month?: string; status?: string }
  ): Promise<DownloadResult> {
    const path = this.buildExportPath(formId, format, options);
    return apiClient.download(path, `formulario-${formId}.${format}`);
  }
}

/** Instancia singleton del servicio de formularios dinámicos. */
export const formsService = new FormsService();
