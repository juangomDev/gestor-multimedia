import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pdfsService } from './pdfsService';
import { apiClient, ApiError } from './apiClient';

describe('pdfsService (v2 Stateless)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockPdf = {
    id: 'pdf-123',
    shortCode: 'doc999',
    originalName: 'contrato.pdf',
    sizeBytes: 1048576,
    pageCount: 5,
    isScanned: false,
    folderId: 'fld-1',
    createdAt: '2026-11-08T00:00:00Z',
    updatedAt: '2026-11-08T01:00:00Z',
  };

  it('listPdfs consulta /api/v1/pdfs con filtros y normaliza items y meta', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: [mockPdf],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    } as never);

    const { items, meta } = await pdfsService.listPdfs({ page: 1, limit: 10, search: 'contrato' });
    expect(getSpy).toHaveBeenCalledWith('/api/v1/pdfs?page=1&limit=10&search=contrato');
    expect(items).toHaveLength(1);
    expect(items[0].shortCode).toBe('doc999');
    expect(items[0].url).toContain('/p/doc999');
    expect(meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
  });

  it('uploadPdf envía folderId antes que file en multipart hacia POST /api/v1/pdfs', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockPdf as never);
    const file = new File(['%PDF-fake'], 'test.pdf', { type: 'application/pdf' });

    const res = await pdfsService.uploadPdf(file, 'fld-1');
    expect(postSpy).toHaveBeenCalledWith('/api/v1/pdfs', expect.any(FormData));
    const sentForm = postSpy.mock.calls[0][1] as FormData;
    expect(Array.from(sentForm.keys())).toEqual(['folderId', 'file']);
    expect(res.id).toBe('pdf-123');
  });

  it('listPdfs preserva urlWithVersion estable sin Date.now() cuando falta updatedAt', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: [
        { ...mockPdf, updatedAt: undefined, urlWithVersion: 'http://localhost:3000/p/doc999?v=77' },
        { ...mockPdf, id: 'pdf-2', shortCode: 'stable2', updatedAt: undefined },
      ],
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    } as never);

    const { items } = await pdfsService.listPdfs();
    expect(items[0].urlWithVersion).toBe('http://localhost:3000/p/doc999?v=77');
    expect(items[1].urlWithVersion).toBe(items[1].url);
  });

  it('renamePdf renombra asegurando extensión .pdf', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      ...mockPdf,
      originalName: 'nuevo.pdf',
    } as never);

    const res = await pdfsService.renamePdf('pdf-123', 'nuevo');
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/pdfs/pdf-123', { originalName: 'nuevo.pdf' });
    expect(res.originalName).toBe('nuevo.pdf');
  });

  it('hotSwapPdf reemplaza el binario preservando shortCode', async () => {
    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValueOnce(mockPdf as never);
    const file = new File(['%PDF-new'], 'updated.pdf', { type: 'application/pdf' });

    const res = await pdfsService.hotSwapPdf('pdf-123', file);
    expect(putSpy).toHaveBeenCalledWith('/api/v1/pdfs/pdf-123', expect.any(FormData));
    expect(res.shortCode).toBe('doc999');
  });

  it('updatePdfMetadata actualiza la ficha técnica OpenAPI (title, description, tags, keywords, summary)', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      ...mockPdf,
      metadataCard: {
        title: 'Manual Legal',
        description: 'Normas 2026',
        tags: ['Legal'],
        keywords: ['contrato'],
        summary: 'Resumen',
      },
    } as never);

    const res = await pdfsService.updatePdfMetadata('pdf-123', {
      title: 'Manual Legal',
      description: 'Normas 2026',
      tags: ['Legal'],
      keywords: ['contrato'],
      summary: 'Resumen',
    });
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/pdfs/pdf-123/metadata', {
      title: 'Manual Legal',
      description: 'Normas 2026',
      tags: ['Legal'],
      keywords: ['contrato'],
      summary: 'Resumen',
    });
    expect(res.metadataCard?.title).toBe('Manual Legal');
    expect(res.metadataCard?.tags).toEqual(['Legal']);
  });

  it('deletePdf llama a DELETE /api/v1/pdfs/:id y propaga errores HTTP', async () => {
    const deleteSpy = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValueOnce(undefined as never)
      .mockRejectedValueOnce(new ApiError(500, 'SERVER_ERROR', 'Fallo disco'));

    await pdfsService.deletePdf('pdf-123');
    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/pdfs/pdf-123');
    await expect(pdfsService.deletePdf('pdf-123')).rejects.toThrow('Fallo disco');
  });

  it('movePdfToFolder envía { folderId } según OpenAPI y rechaza folderId vacío', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      ...mockPdf,
      folderId: 'fld-2',
    } as never);

    const res = await pdfsService.movePdfToFolder('pdf-123', 'fld-2');
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/pdfs/pdf-123/folder', {
      folderId: 'fld-2',
    });
    expect(res.folderId).toBe('fld-2');
    await expect(pdfsService.movePdfToFolder('pdf-123', '')).rejects.toThrow(/carpeta PDF/i);
  });

  it('fetchPdfExtractedText consulta texto estructurado con ruta relativa y skipAuth', async () => {
    const mockText = {
      shortCode: 'doc999',
      totalPages: 1,
      pages: [{ pageNumber: 1, text: 'Texto de prueba' }],
    };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockText as never);

    const res = await pdfsService.fetchPdfExtractedText('doc999', 1);
    expect(getSpy).toHaveBeenCalledWith('/p/doc999?format=text&page=1', { skipAuth: true });
    expect(res.pages[0].text).toBe('Texto de prueba');
  });
});
