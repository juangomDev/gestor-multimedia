import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { pdfsService } from '../../services/pdfsService';
import { storageService } from '../../services/storageService';
import { PdfViewerDialog } from './PdfViewerDialog';
import type { PdfItem } from '../../types/media';

const PDF_FIXTURE: PdfItem = {
  id: 'pdf-uuid-1',
  shortCode: 'pdf01',
  originalName: 'normativa-interna.pdf',
  sizeBytes: 524288,
  pageCount: 6,
  isScanned: false,
  folderId: 'fld-pdfs',
  metadataCard: {
    category: 'Normativa',
    summary: 'Lineamientos operativos anuales',
    keywords: ['compliance'],
    custom: { version: '2.0' },
  },
  createdAt: '2026-11-19T09:00:00Z',
  url: 'http://localhost:3000/p/pdf01',
  urlWithVersion: 'http://localhost:3000/p/pdf01?v=2000',
};

function renderPdfViewer(props?: Partial<React.ComponentProps<typeof PdfViewerDialog>>) {
  const user = { id: 'u-admin', username: 'admin', role: 'ADMIN' as const, isActive: true };
  storageService.saveSession({ token: 'jwt-admin', user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  const queryClient = createAppQueryClient();

  return render(
    <AppProviders queryClient={queryClient}>
      <PdfViewerDialog
        open={true}
        onOpenChange={vi.fn()}
        shortCode="pdf01"
        initialPage={3}
        pdf={PDF_FIXTURE}
        canEdit={true}
        {...props}
      />
    </AppProviders>
  );
}

describe('PdfViewerDialog y PdfMetadataDialog (Fase 5.3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
  });

  it('muestra iframe con #page=N, descarga ?download=true y pestaña Texto extraído (?format=text)', async () => {
    const textSpy = vi.spyOn(pdfsService, 'fetchPdfExtractedText').mockResolvedValue({
      shortCode: 'pdf01',
      totalPages: 6,
      pages: [
        { pageNumber: 1, text: 'Introducción del manual', charCount: 23 },
        { pageNumber: 2, text: 'Cláusula de auditoría fiscal', charCount: 28 },
      ],
    });

    renderPdfViewer();

    const iframe = await screen.findByTitle('normativa-interna.pdf');
    expect(iframe).toHaveAttribute('src', 'http://localhost:3000/p/pdf01?v=2000#page=3');

    const downloadLink = screen.getByRole('link', { name: /Descargar PDF/i });
    expect(downloadLink).toHaveAttribute('href', 'http://localhost:3000/p/pdf01?download=true');

    // Cambiar a pestaña Texto extraído
    const textTab = screen.getByRole('tab', { name: 'Texto extraído' });
    fireEvent.mouseDown(textTab);
    fireEvent.click(textTab);

    await waitFor(() => {
      expect(textSpy).toHaveBeenCalledWith('pdf01', undefined);
    });
    expect(await screen.findByText(/Cláusula de auditoría fiscal/i)).toBeInTheDocument();

    // Filtrar texto extraído y saltar a la página en el documento
    fireEvent.change(screen.getByLabelText('Filtrar páginas de texto extraído'), {
      target: { value: 'auditoría' },
    });
    await waitFor(() => {
      expect(screen.queryByText(/Introducción del manual/i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver en documento/i }));
    await waitFor(() => {
      expect(screen.getByTitle('normativa-interna.pdf')).toHaveAttribute(
        'src',
        'http://localhost:3000/p/pdf01?v=2000#page=2'
      );
    });
  });

  it('advierte explícitamente cuando el documento PDF es escaneado (isScanned: true)', async () => {
    vi.spyOn(pdfsService, 'fetchPdfExtractedText').mockResolvedValue({
      shortCode: 'pdf01',
      totalPages: 2,
      pages: [{ pageNumber: 1, text: '', charCount: 0 }],
    });

    renderPdfViewer({
      pdf: { ...PDF_FIXTURE, isScanned: true },
    });

    const textTab = screen.getByRole('tab', { name: 'Texto extraído' });
    fireEvent.mouseDown(textTab);
    fireEvent.click(textTab);

    expect(await screen.findByTestId('pdf-scanned-warning')).toHaveTextContent(/escaneado/i);
  });

  it('actualiza metadatos del PDF (category, summary, keywords, custom) vía PATCH /api/v1/pdfs/:id/metadata', async () => {
    const updateMetaSpy = vi.spyOn(pdfsService, 'updatePdfMetadata').mockResolvedValue({
      ...PDF_FIXTURE,
      metadataCard: {
        category: 'Legal',
        summary: 'Resumen actualizado',
        keywords: ['compliance', 'auditoria'],
        custom: { version: '2.0', area: 'Finanzas' },
      },
    });

    renderPdfViewer();
    fireEvent.click(await screen.findByTestId('pdf-open-metadata-btn'));

    fireEvent.change(await screen.findByLabelText('Categoría documental'), {
      target: { value: 'Legal' },
    });
    fireEvent.change(screen.getByLabelText('Resumen ejecutivo'), {
      target: { value: 'Resumen actualizado' },
    });
    fireEvent.change(screen.getByLabelText('Nueva palabra clave'), {
      target: { value: 'auditoria' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));

    fireEvent.click(screen.getByRole('button', { name: /Añadir campo/i }));
    const keyInputs = screen.getAllByLabelText('Clave personalizada');
    const valInputs = screen.getAllByLabelText('Valor personalizado');
    fireEvent.change(keyInputs[1], { target: { value: 'area' } });
    fireEvent.change(valInputs[1], { target: { value: 'Finanzas' } });

    fireEvent.click(screen.getByTestId('pdf-metadata-save-btn'));

    await waitFor(() => {
      expect(updateMetaSpy).toHaveBeenCalledWith('pdf-uuid-1', {
        category: 'Legal',
        summary: 'Resumen actualizado',
        keywords: ['compliance', 'auditoria'],
        custom: { version: '2.0', area: 'Finanzas' },
      });
    });
  });
});
