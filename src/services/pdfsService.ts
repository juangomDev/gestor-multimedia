import { apiClient } from './apiClient';
import { storageService } from './storageService';
import { buildPublicAssetUrl } from '../utils/formatters';
import type { PdfItem, PdfMetadataCard } from '../types/media';

/**
 * Parámetros de consulta y filtrado para el catálogo de PDFs.
 */
export interface FetchPdfsOptions {
  page?: number;
  limit?: number;
  folderId?: string | null;
  search?: string;
}

/**
 * Metadatos de paginación del catálogo de documentos PDF.
 */
export interface PdfsPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Estructura del texto estructurado extraído por página (`/p/:short_code?format=text`).
 */
export interface PdfExtractedTextResponse {
  shortCode: string;
  totalPages: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    charCount?: number;
  }>;
}

/**
 * Estructura cruda devuelta por `monolith-backend` para documentos PDF.
 */
interface RawApiPdf {
  id: string;
  shortCode: string;
  originalName: string;
  sizeBytes: number;
  pageCount?: number;
  isScanned?: boolean;
  folderId?: string | null;
  userId?: string | null;
  metadataCard?: PdfMetadataCard | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Normaliza una entidad de PDF cruda proveniente del backend hacia `PdfItem`.
 */
function normalizePdf(raw: RawApiPdf, baseUrl: string): PdfItem {
  const shortCode = raw.shortCode || raw.id;
  const canonicalUrl = buildPublicAssetUrl(baseUrl, 'p' as 'i', shortCode);
  return {
    id: raw.id,
    shortCode,
    originalName: raw.originalName,
    sizeBytes: raw.sizeBytes || 0,
    pageCount: raw.pageCount || 1,
    isScanned: Boolean(raw.isScanned),
    folderId: raw.folderId || null,
    userId: raw.userId || null,
    metadataCard: raw.metadataCard || null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt,
    url: canonicalUrl,
    urlWithVersion: `${canonicalUrl}?v=${raw.updatedAt ? new Date(raw.updatedAt).getTime() : Date.now()}`,
  };
}

/**
 * Servicio integral para la gestión de documentos PDF (`/api/v1/pdfs` y `/p/:short_code`).
 * Implementa el patrón de doble artefacto binario/texto, visor enriquecido y RAG documental.
 */
export class PdfsService {
  private lastPaginationMeta: PdfsPaginationMeta | null = null;

  /**
   * Obtiene la lista de documentos PDF desde el backend con paginación y filtros.
   */
  async fetchRemotePdfs(options?: FetchPdfsOptions): Promise<PdfItem[]> {
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.folderId) params.set('folderId', options.folderId);
    if (options?.search) params.set('search', options.search.trim());

    const qs = params.toString();
    const endpoint = qs ? `/api/v1/pdfs?${qs}` : '/api/v1/pdfs';

    try {
      const res = await apiClient.get<{
        data?: RawApiPdf[];
        pdfs?: RawApiPdf[];
        meta?: PdfsPaginationMeta;
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
      }>(endpoint);

      const rawList = res.data || res.pdfs || [];
      const base = storageService.getConfig().baseUrl;
      const items = rawList.map((p) => normalizePdf(p, base));

      const total = res.meta?.total ?? res.total ?? items.length;
      const page = res.meta?.page ?? res.page ?? options?.page ?? 1;
      const limit = res.meta?.limit ?? res.limit ?? options?.limit ?? 50;
      const totalPages = res.meta?.totalPages ?? res.totalPages ?? Math.max(1, Math.ceil(total / limit));

      this.lastPaginationMeta = { total, page, limit, totalPages };
      if (!options?.search && !options?.folderId) {
        storageService.savePdfs(items);
      }
      return items;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        return this.getPdfs(options?.folderId);
      }
      throw err;
    }
  }

  /**
   * Obtiene los PDFs almacenados en caché local, opcionalmente filtrados por carpeta.
   */
  getPdfs(folderId?: string | null): PdfItem[] {
    const all = storageService.getPdfs();
    if (folderId === undefined) return all;
    return all.filter((p) => (folderId ? p.folderId === folderId : !p.folderId));
  }

  /**
   * Retorna los metadatos de paginación de la última consulta.
   */
  getLastPaginationMeta(): PdfsPaginationMeta | null {
    return this.lastPaginationMeta;
  }

  /**
   * Sube un nuevo documento PDF mediante multipart/form-data.
   */
  async uploadPdf(file: File, folderId?: string | null): Promise<PdfItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    const res = await apiClient.post<RawApiPdf | { pdf: RawApiPdf }>('/api/v1/pdfs', formData);
    const raw = 'pdf' in res ? res.pdf : res;
    const item = normalizePdf(raw, storageService.getConfig().baseUrl);
    storageService.addPdf(item);
    return item;
  }

  /**
   * Renombra el nombre original de un archivo PDF (`PATCH /api/v1/pdfs/:id`).
   */
  async renamePdf(id: string, originalName: string): Promise<PdfItem> {
    const trimmed = originalName.trim();
    const finalName = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
    const res = await apiClient.patch<RawApiPdf | { pdf: RawApiPdf }>(`/api/v1/pdfs/${id}`, {
      originalName: finalName,
    });
    const raw = 'pdf' in res ? res.pdf : res;
    const item = normalizePdf(raw, storageService.getConfig().baseUrl);
    storageService.addPdf(item);
    return item;
  }

  /**
   * Realiza un reemplazo en caliente (Hot-Swap) preservando ID y shortCode (`PUT /api/v1/pdfs/:id`).
   */
  async hotSwapPdf(id: string, file: File): Promise<PdfItem> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.put<RawApiPdf | { pdf: RawApiPdf }>(`/api/v1/pdfs/${id}`, formData);
    const raw = 'pdf' in res ? res.pdf : res;
    const item = normalizePdf(raw, storageService.getConfig().baseUrl);
    storageService.addPdf(item);
    return item;
  }

  /**
   * Actualiza la ficha técnica semántica de un documento PDF (`PATCH /api/v1/pdfs/:id/metadata`).
   */
  async updatePdfMetadata(id: string, metadata: PdfMetadataCard): Promise<PdfItem> {
    const res = await apiClient.patch<RawApiPdf | { pdf: RawApiPdf }>(`/api/v1/pdfs/${id}/metadata`, metadata);
    const raw = 'pdf' in res ? res.pdf : res;
    const item = normalizePdf(raw, storageService.getConfig().baseUrl);
    storageService.addPdf(item);
    return item;
  }

  /**
   * Destruye lógica y físicamente el documento PDF y su texto comprimido (`DELETE /api/v1/pdfs/:id`).
   */
  async deletePdf(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/pdfs/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number })?.status;
      if (status !== 404 && status !== 400 && !msg.includes('404') && !msg.toLowerCase().includes('not found')) {
        throw err;
      }
    }
    storageService.removePdf(id);
  }

  /**
   * Reasigna un PDF a otra carpeta verificando que sea de tipo PDF (`PATCH /api/v1/pdfs/:id/folder`).
   */
  async movePdfToFolder(id: string, targetFolderId: string | null): Promise<PdfItem> {
    const res = await apiClient.patch<RawApiPdf | { pdf: RawApiPdf }>(`/api/v1/pdfs/${id}/folder`, {
      targetFolderId,
    });
    const raw = 'pdf' in res ? res.pdf : res;
    const item = normalizePdf(raw, storageService.getConfig().baseUrl);
    storageService.movePdfToFolder(id, targetFolderId);
    return item;
  }

  /**
   * Construye la Capability URL pública del PDF (`/p/:shortCode`).
   */
  getPdfUrl(shortCode: string): string {
    return buildPublicAssetUrl(storageService.getConfig().baseUrl, 'p' as 'i', shortCode);
  }

  /**
   * Construye la URL de descarga forzada del PDF (`/p/:shortCode?download=true`).
   */
  getPdfDownloadUrl(shortCode: string): string {
    return `${this.getPdfUrl(shortCode)}?download=true`;
  }

  /**
   * Construye la URL de consulta de texto estructurado extraído (`/p/:shortCode?format=text`).
   */
  getPdfTextUrl(shortCode: string, page?: number): string {
    const base = `${this.getPdfUrl(shortCode)}?format=text`;
    return page ? `${base}&page=${page}` : base;
  }

  /**
   * Consulta el texto estructurado del documento PDF descomprimido al vuelo.
   */
  async fetchPdfExtractedText(shortCode: string, page?: number): Promise<PdfExtractedTextResponse> {
    const url = this.getPdfTextUrl(shortCode, page);
    return apiClient.get<PdfExtractedTextResponse>(url);
  }
}

export const pdfsService = new PdfsService();

