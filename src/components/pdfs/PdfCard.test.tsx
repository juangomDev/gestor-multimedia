import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfCard } from './PdfCard';
import { ToastProvider } from '../../context/ToastContext';
import type { PdfItem } from '../../types/media';

describe('PdfCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPdf: PdfItem = {
    id: 'pdf-001',
    shortCode: 'docabc',
    originalName: 'manual_usuario.pdf',
    sizeBytes: 2097152,
    pageCount: 12,
    isScanned: true,
    folderId: 'fld-1',
    metadataCard: { category: 'Manuales', summary: 'Guía técnica' },
    createdAt: '2026-11-08T00:00:00Z',
    url: 'http://localhost:3000/p/docabc',
  };

  it('renderiza nombre, badges de páginas, OCR, peso y ficha técnica', () => {
    render(
      <ToastProvider>
        <PdfCard pdf={mockPdf} onOpenViewer={vi.fn()} />
      </ToastProvider>
    );

    expect(screen.getByText('manual_usuario.pdf')).toBeInTheDocument();
    expect(screen.getByText('12 págs')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
    expect(screen.getByText(/OCR/)).toBeInTheDocument();
    expect(screen.getByText('Manuales')).toBeInTheDocument();
    expect(screen.getByText('/p/docabc')).toBeInTheDocument();
  });

  it('despacha onOpenViewer al hacer clic en la tarjeta o botón de ver', () => {
    const onOpenViewer = vi.fn();
    render(
      <ToastProvider>
        <PdfCard pdf={mockPdf} onOpenViewer={onOpenViewer} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('pdf-card-pdf-001'));
    expect(onOpenViewer).toHaveBeenCalledWith(mockPdf);
  });

  it('permite accionar botones de renombrar, hot-swap, metadata y eliminar', () => {
    const onRename = vi.fn();
    const onHotSwap = vi.fn();
    const onMetadata = vi.fn();
    const onDelete = vi.fn();

    render(
      <ToastProvider>
        <PdfCard
          pdf={mockPdf}
          onOpenViewer={vi.fn()}
          onOpenRename={onRename}
          onOpenHotSwap={onHotSwap}
          onOpenMetadata={onMetadata}
          onDelete={onDelete}
        />
      </ToastProvider>
    );

    fireEvent.click(screen.getByLabelText('Renombrar archivo'));
    expect(onRename).toHaveBeenCalledWith(mockPdf);

    fireEvent.click(screen.getByLabelText('Reemplazar archivo'));
    expect(onHotSwap).toHaveBeenCalledWith(mockPdf);

    fireEvent.click(screen.getByLabelText('Editar ficha técnica'));
    expect(onMetadata).toHaveBeenCalledWith(mockPdf);

    fireEvent.click(screen.getByLabelText('Eliminar PDF'));
    expect(onDelete).toHaveBeenCalledWith(mockPdf);
  });
});

