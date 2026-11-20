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
 * Respuesta estructurada de listado paginado de PDFs.
 */
export interface PaginatedPdfsResult {
  items: PdfItem[];
  meta: PdfsPaginationMeta;
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
  urlWithVersion?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Valida si un archivo corresponde a un documento PDF soportado.
 *
 * @param file Archivo a validar.
 * @returns `true` si el MIME es `application/pdf` o la extensión es `.pdf`.
 */
export function isSupportedPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

/**
 * Normaliza una entidad de PDF cruda proveniente del backend hacia `PdfItem`.
 */
function normalizePdf(raw: RawApiPdf, baseUrl: string): PdfItem {
  const shortCode = raw.shortCode || raw.id;
  const canonicalUrl = buildPublicAssetUrl(baseUrl, 'p', shortCode);
  const updatedMs = raw.updatedAt ? Date.parse(raw.updatedAt) : Number.NaN;
  const stableVersionedUrl =
    raw.urlWithVersion || (Number.isFinite(updatedMs) ? `${canonicalUrl}?v=${updatedMs}` : canonicalUrl);

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
    urlWithVersion: stableVersionedUrl,
  };
}

/**
 * Servicio HTTP sin estado para gestión de documentos PDF (`/api/v1/pdfs` y `/p/:short_code`).
 * Implementa el patrón de doble artefacto binario/texto, metadatos semánticos y RAG documental.
 */
export class PdfsService {
  /**
   * Lista documentos PDF desde `GET /api/v1/pdfs` devolviendo items y metadatos de paginación.
   */
  async listPdfs(options?: FetchPdfsOptions): Promise<PaginatedPdfsResult> {
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.folderId) params.set('folderId', options.folderId);
    if (options?.search && options.search.trim()) params.set('search', options.search.trim());

    const qs = params.toString();
    const endpoint = qs ? `/api/v1/pdfs?${qs}` : '/api/v1/pdfs';

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
    const baseUrl = storageService.getApiBaseUrl();
    const items = rawList.map((p) => normalizePdf(p, baseUrl));

    const total = res.meta?.total ?? res.total ?? items.length;
    const page = res.meta?.page ?? res.page ?? options?.page ?? 1;
    const limit = res.meta?.limit ?? res.limit ?? options?.limit ?? 50;
    const totalPages =
      res.meta?.totalPages ?? res.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));

    const meta: PdfsPaginationMeta = { total, page, limit, totalPages };
    return { items, meta };
  }

  /**
   * Sube un nuevo documento PDF mediante `multipart/form-data` (`POST /api/v1/pdfs`).
   */
  async uploadPdf(file: File, folderId?: string | null): Promise<PdfItem> {
    if (!isSupportedPdfFile(file)) {
      throw new Error(`El archivo '${file.name}' no es un documento PDF válido`);
    }

    const formData = new FormData();
    if (folderId) formData.append('folderId', folderId);
    formData.append('file', file);

    const res = await apiClient.post<RawApiPdf | { pdf: RawApiPdf }>('/api/v1/pdfs', formData);
    const raw = 'pdf' in res ? res.pdf : res;
    return normalizePdf(raw, storageService.getApiBaseUrl());
  }

  /**
   * Renombra el nombre original de un archivo PDF (`PATCH /api/v1/pdfs/:id`).
   */
  async renamePdf(id: string, originalName: string): Promise<PdfItem> {
    const trimmed = originalName.trim();
    if (!trimmed) {
      throw new Error('El nombre del documento PDF no puede estar vacío');
    }
    const finalName = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
    const res = await apiClient.patch<RawApiPdf | { pdf: RawApiPdf }>(`/api/v1/pdfs/${id}`, {
      originalName: finalName,
    });
    const raw = 'pdf' in res ? res.pdf : res;
    return normalizePdf(raw, storageService.getApiBaseUrl());
  }

  /**
   * Realiza un reemplazo en caliente (Hot-Swap) preservando ID y `shortCode` (`PUT /api/v1/pdfs/:id`).
   */
  async hotSwapPdf(id: string, file: File): Promise<PdfItem> {
    if (!isSupportedPdfFile(file)) {
      throw new Error(`El archivo '${file.name}' no es un documento PDF válido`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.put<RawApiPdf | { pdf: RawApiPdf }>(`/api/v1/pdfs/${id}`, formData);
    const raw = 'pdf' in res ? res.pdf : res;
    return normalizePdf(raw, storageService.getApiBaseUrl());
  }

  /**
   * Actualiza la ficha técnica semántica de un documento PDF (`PATCH /api/v1/pdfs/:id/metadata`).
   */
  async updatePdfMetadata(id: string, metadata: PdfMetadataCard): Promise<PdfItem> {
    const res = await apiClient.patch<RawApiPdf | { pdf: RawApiPdf }>(
      `/api/v1/pdfs/${id}/metadata`,
      metadata
    );
    const raw = 'pdf' in res ? res.pdf : res;
    return normalizePdf(raw, storageService.getApiBaseUrl());
  }

  /**
   * Destruye lógica y físicamente el documento PDF y su texto comprimido (`DELETE /api/v1/pdfs/:id`).
   */
  async deletePdf(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/pdfs/${id}`);
  }

  /**
   * Reasigna un PDF a otra carpeta verificando que sea de tipo `PDF` (`PATCH /api/v1/pdfs/:id/folder`).
   *
   * @param id UUID del documento PDF.
   * @param folderId UUID obligatorio de la carpeta `PDF` de destino.
   * @returns Documento PDF actualizado.
   */
  async movePdfToFolder(id: string, folderId: string): Promise<PdfItem> {
    if (!folderId || !folderId.trim()) {
      throw new Error('Debe especificar una carpeta PDF de destino válida');
    }
    const res = await apiClient.patch<RawApiPdf | { pdf: RawApiPdf }>(
      `/api/v1/pdfs/${id}/folder`,
      { folderId }
    );
    const raw = 'pdf' in res ? res.pdf : res;
    return normalizePdf(raw, storageService.getApiBaseUrl());
  }

  /**
   * Construye la Capability URL pública del PDF (`/p/:shortCode`).
   */
  getPdfUrl(shortCode: string): string {
    return buildPublicAssetUrl(storageService.getApiBaseUrl(), 'p', shortCode);
  }

  /**
   * Construye la URL de descarga forzada del PDF (`/p/:shortCode?download=true`).
   */
  getPdfDownloadUrl(shortCode: string): string {
    return `${this.getPdfUrl(shortCode)}?download=true`;
  }

  /**
   * Consulta el texto estructurado del documento PDF descomprimido al vuelo (`/p/:shortCode?format=text`).
   */
  async fetchPdfExtractedText(
    shortCode: string,
    page?: number
  ): Promise<PdfExtractedTextResponse> {
    const encoded = encodeURIComponent(shortCode);
    const path = page ? `/p/${encoded}?format=text&page=${page}` : `/p/${encoded}?format=text`;
    return apiClient.get<PdfExtractedTextResponse>(path, { skipAuth: true });
  }
}

/** Instancia singleton del servicio de documentos PDF. */
export const pdfsService = new PdfsService();
