import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfsCatalogView } from './PdfsCatalogView';
import { pdfsService } from '../services/pdfsService';
import { ToastProvider } from '../context/ToastContext';
import type { PdfItem } from '../types/media';

describe('PdfsCatalogView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPdfs: PdfItem[] = [
    {
      id: 'p-1',
      shortCode: 'doc01',
      originalName: 'reporte.pdf',
      sizeBytes: 1048576,
      pageCount: 4,
      isScanned: false,
      folderId: null,
      createdAt: '2026-11-08T00:00:00Z',
      url: 'http://localhost:3000/p/doc01',
    },
  ];

  it('renderiza la lista de PDFs y permite abrir el modal de subida', async () => {
    vi.spyOn(pdfsService, 'fetchRemotePdfs').mockResolvedValue(mockPdfs);
    vi.spyOn(pdfsService, 'getLastPaginationMeta').mockReturnValue({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(
      <ToastProvider>
        <PdfsCatalogView />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('reporte.pdf')).toBeInTheDocument();
      expect(screen.getByText('4 págs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Subir PDF/i }));
    expect(screen.getByText('Subir Documento PDF')).toBeInTheDocument();
  });

  it('permite buscar en el catálogo de PDFs actualizando el filtro', async () => {
    const fetchSpy = vi.spyOn(pdfsService, 'fetchRemotePdfs').mockResolvedValue(mockPdfs);

    render(
      <ToastProvider>
        <PdfsCatalogView />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('reporte.pdf')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar en PDFs...');
    fireEvent.change(searchInput, { target: { value: 'reporte' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'reporte' })
      );
    });
  });
});

