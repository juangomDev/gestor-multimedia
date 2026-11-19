import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { storageService } from '../../services/storageService';
import { PdfViewerDialog } from './PdfViewerDialog';
import type { PdfItem } from '../../types/media';

const PDF_SAMPLE: PdfItem = {
  id: 'pdf-blob-1',
  shortCode: '48H2jSQomz',
  originalName: 'Listado de Preguntas Frecuentes.pdf',
  sizeBytes: 23654,
  pageCount: 2,
  isScanned: false,
  folderId: 'fld-faq',
  createdAt: '2026-11-19T18:00:00Z',
  url: 'http://divulgacion.ine.gob.ve/api/v1/p/48H2jSQomz',
  urlWithVersion: 'http://divulgacion.ine.gob.ve/api/v1/p/48H2jSQomz?v=1000',
};

function renderViewer() {
  const user = { id: 'u-mgr', username: 'juan', role: 'MANAGER' as const, isActive: true };
  storageService.saveSession({ token: 'jwt-mgr', user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });

  return render(
    <AppProviders queryClient={createAppQueryClient()}>
      <PdfViewerDialog
        open={true}
        onOpenChange={vi.fn()}
        shortCode={PDF_SAMPLE.shortCode}
        pdf={PDF_SAMPLE}
        canEdit={true}
      />
    </AppProviders>
  );
}

describe('usePdfBlobUrl en PdfViewerDialog (bypass local blob: para X-Frame-Options/CSP)', () => {
  const originalFetch = globalThis.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://divulgacion.ine.gob.ve/api/v1');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('precarga el PDF remoto como Blob del mismo origen, soporta #page=N y revoca el ObjectURL al desmontar', async () => {
    const createUrlSpy = vi.fn(() => 'blob:http://localhost:5173/mock-pdf-uuid');
    const revokeUrlSpy = vi.fn();
    URL.createObjectURL = createUrlSpy;
    URL.revokeObjectURL = revokeUrlSpy;

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/pdf' }),
      blob: async () => new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
    } as unknown as Response);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const view = renderViewer();

    const iframe = await screen.findByTitle('Listado de Preguntas Frecuentes.pdf');
    expect(iframe).toHaveAttribute('src', 'blob:http://localhost:5173/mock-pdf-uuid#page=1');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://divulgacion.ine.gob.ve/api/v1/p/48H2jSQomz?v=1000',
      expect.objectContaining({ credentials: 'omit' })
    );

    // Cambiar de página reutiliza el mismo Blob sin volver a descargar de red
    fireEvent.change(screen.getByLabelText('Ir a página:'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ir' }));

    await waitFor(() => {
      expect(screen.getByTitle('Listado de Preguntas Frecuentes.pdf')).toHaveAttribute(
        'src',
        'blob:http://localhost:5173/mock-pdf-uuid#page=2'
      );
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:http://localhost:5173/mock-pdf-uuid');
  });

  it('revoca el Blob al cerrar y genera uno nuevo limpio al reabrir el mismo PDF', async () => {
    let seq = 0;
    const createUrlSpy = vi.fn(() => `blob:http://localhost:5173/pdf-session-${++seq}`);
    const revokeUrlSpy = vi.fn();
    URL.createObjectURL = createUrlSpy;
    URL.revokeObjectURL = revokeUrlSpy;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/pdf' }),
      blob: async () => new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
    } as unknown as Response) as unknown as typeof fetch;

    const user = { id: 'u-mgr', username: 'juan', role: 'MANAGER' as const, isActive: true };
    storageService.saveSession({ token: 'jwt-mgr', user });
    vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
    const qc = createAppQueryClient();

    const view = render(
      <AppProviders queryClient={qc}>
        <PdfViewerDialog
          open={true}
          onOpenChange={vi.fn()}
          shortCode={PDF_SAMPLE.shortCode}
          pdf={PDF_SAMPLE}
        />
      </AppProviders>
    );

    expect(await screen.findByTitle('Listado de Preguntas Frecuentes.pdf')).toHaveAttribute(
      'src',
      'blob:http://localhost:5173/pdf-session-1#page=1'
    );

    view.rerender(
      <AppProviders queryClient={qc}>
        <PdfViewerDialog
          open={false}
          onOpenChange={vi.fn()}
          shortCode={PDF_SAMPLE.shortCode}
          pdf={PDF_SAMPLE}
        />
      </AppProviders>
    );
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:http://localhost:5173/pdf-session-1');

    view.rerender(
      <AppProviders queryClient={qc}>
        <PdfViewerDialog
          open={true}
          onOpenChange={vi.fn()}
          shortCode={PDF_SAMPLE.shortCode}
          pdf={PDF_SAMPLE}
        />
      </AppProviders>
    );
    expect(await screen.findByTitle('Listado de Preguntas Frecuentes.pdf')).toHaveAttribute(
      'src',
      'blob:http://localhost:5173/pdf-session-2#page=1'
    );
  });

  it('degrada limpiamente a la URL directa cuando falla la descarga CORS del Blob', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost:5173/unused');
    URL.revokeObjectURL = vi.fn();
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    renderViewer();

    const iframe = await screen.findByTitle('Listado de Preguntas Frecuentes.pdf');
    expect(iframe).toHaveAttribute(
      'src',
      'http://divulgacion.ine.gob.ve/api/v1/p/48H2jSQomz?v=1000#page=1'
    );
  });
});
