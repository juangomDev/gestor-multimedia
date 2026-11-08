import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfViewerModal } from './PdfViewerModal';
import { pdfsService } from '../../services/pdfsService';
import { ToastProvider } from '../../context/ToastContext';
import type { PdfItem } from '../../types/media';

describe('PdfViewerModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPdf: PdfItem = {
    id: 'pdf-002',
    shortCode: 'docview',
    originalName: 'balance.pdf',
    sizeBytes: 1024,
    pageCount: 3,
    url: 'http://localhost:3000/p/docview',
    createdAt: '2026-11-08T00:00:00Z',
    metadataCard: { summary: 'Resumen financiero' },
  };

  it('renderiza visor embebido y permite alternar a la pestaña de texto extraído', async () => {
    const mockText = {
      shortCode: 'docview',
      totalPages: 3,
      pages: [
        { pageNumber: 1, text: 'Página 1: Ingresos totales' },
        { pageNumber: 2, text: 'Página 2: Egresos y costos' },
        { pageNumber: 3, text: 'Página 3: Utilidad neta' },
      ],
    };

    vi.spyOn(pdfsService, 'fetchPdfExtractedText').mockResolvedValue(mockText);

    render(
      <ToastProvider>
        <PdfViewerModal pdf={mockPdf} isOpen={true} onClose={vi.fn()} />
      </ToastProvider>
    );

    expect(screen.getByText('Documento PDF — balance.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Visor PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Descargar Original/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/p/docview?download=true')
    );

    // Cambiar a pestaña Texto Extraído
    fireEvent.click(screen.getByRole('button', { name: /Texto Extraído/i }));

    await waitFor(() => {
      expect(screen.getByText('Página 1: Ingresos totales')).toBeInTheDocument();
    });

    // Navegar a siguiente página
    fireEvent.click(screen.getByTitle('Página siguiente'));
    expect(screen.getByText('Página 2: Egresos y costos')).toBeInTheDocument();
  });
});
