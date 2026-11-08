import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pdfsService } from './pdfsService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('pdfsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('fetchRemotePdfs consulta /api/v1/pdfs con filtros y normaliza', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: [mockPdf],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    } as never);

    const res = await pdfsService.fetchRemotePdfs({ page: 1, limit: 10, search: 'contrato' });
    expect(getSpy).toHaveBeenCalledWith('/api/v1/pdfs?page=1&limit=10&search=contrato');
    expect(res).toHaveLength(1);
    expect(res[0].shortCode).toBe('doc999');
    expect(res[0].url).toContain('/p/doc999');
  });

  it('uploadPdf envía archivo multipart a POST /api/v1/pdfs', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockPdf as never);
    const file = new File(['%PDF-fake'], 'test.pdf', { type: 'application/pdf' });

    const res = await pdfsService.uploadPdf(file, 'fld-1');
    expect(postSpy).toHaveBeenCalledWith('/api/v1/pdfs', expect.any(FormData));
    expect(res.id).toBe('pdf-123');
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

  it('updatePdfMetadata actualiza la ficha técnica semántica', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      ...mockPdf,
      metadataCard: { category: 'Legal', summary: 'Resumen' },
    } as never);

    const res = await pdfsService.updatePdfMetadata('pdf-123', { category: 'Legal', summary: 'Resumen' });
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/pdfs/pdf-123/metadata', { category: 'Legal', summary: 'Resumen' });
    expect(res.metadataCard?.category).toBe('Legal');
  });

  it('deletePdf elimina el archivo y limpia caché', async () => {
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce(undefined as never);
    const removeSpy = vi.spyOn(storageService, 'removePdf');

    await pdfsService.deletePdf('pdf-123');
    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/pdfs/pdf-123');
    expect(removeSpy).toHaveBeenCalledWith('pdf-123');
  });

  it('movePdfToFolder actualiza la carpeta destino', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      ...mockPdf,
      folderId: 'fld-2',
    } as never);

    const res = await pdfsService.movePdfToFolder('pdf-123', 'fld-2');
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/pdfs/pdf-123/folder', { targetFolderId: 'fld-2' });
    expect(res.folderId).toBe('fld-2');
  });

  it('fetchPdfExtractedText consulta texto estructurado por página', async () => {
    const mockText = {
      shortCode: 'doc999',
      totalPages: 1,
      pages: [{ pageNumber: 1, text: 'Texto de prueba' }],
    };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockText as never);

    const res = await pdfsService.fetchPdfExtractedText('doc999', 1);
    expect(getSpy).toHaveBeenCalledWith(expect.stringContaining('/p/doc999?format=text&page=1'));
    expect(res.pages[0].text).toBe('Texto de prueba');
  });
});

