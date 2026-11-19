import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { imagesService } from '../../services/imagesService';
import { storageService } from '../../services/storageService';
import { ImageInspectorDialog } from './ImageInspectorDialog';
import type { ImageItem } from '../../types/media';

const IMAGE_FIXTURE: ImageItem = {
  id: 'img-uuid-1',
  shortCode: 'img01',
  originalName: 'portada-editorial.png',
  mimeType: 'image/png',
  sizeBytes: 245760,
  width: 1920,
  height: 1080,
  url: 'http://localhost:3000/i/img01',
  urlWithVersion: 'http://localhost:3000/i/img01?v=1000',
  folderId: 'fld-imgs',
  createdAt: '2026-11-19T10:00:00Z',
};

function renderInspector(props?: Partial<React.ComponentProps<typeof ImageInspectorDialog>>) {
  const user = { id: 'u-admin', username: 'admin', role: 'ADMIN' as const, isActive: true };
  storageService.saveSession({ token: 'jwt-admin', user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  const queryClient = createAppQueryClient();

  return render(
    <AppProviders queryClient={queryClient}>
      <ImageInspectorDialog
        open={true}
        onOpenChange={vi.fn()}
        shortCode="img01"
        image={IMAGE_FIXTURE}
        canEdit={true}
        {...props}
      />
    </AppProviders>
  );
}

describe('ImageInspectorDialog, RenameAssetDialog y HotSwapAssetDialog (Fase 5.1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
  });

  it('carga la variante original con ?v=, muestra metadatos y cambia modos de zoom', async () => {
    renderInspector();

    const img = await screen.findByRole('img', { name: 'portada-editorial.png' });
    expect(img).toHaveAttribute('src', 'http://localhost:3000/i/img01?variant=original&v=1000');
    expect(screen.getByText('1920 × 1080 px')).toBeInTheDocument();
    expect(screen.getByText('image/png')).toBeInTheDocument();
    expect(screen.getByText('i/img01')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '100%' }));
    expect(img.className).toContain('imageActual');

    fireEvent.click(screen.getByRole('button', { name: /150%/i }));
    expect(img.className).toContain('imageZoomLarge');
  });

  it('renombra la imagen usando RenameAssetDialog (PATCH /api/v1/images/:id)', async () => {
    const renameSpy = vi.spyOn(imagesService, 'renameImage').mockResolvedValue({
      ...IMAGE_FIXTURE,
      originalName: 'portada-final.png',
    });

    renderInspector();
    fireEvent.click(await screen.findByRole('button', { name: 'Renombrar' }));

    const input = await screen.findByLabelText('Nombre de la imagen');
    fireEvent.change(input, { target: { value: 'portada-final.png' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar nombre/i }));

    await waitFor(() => {
      expect(renameSpy).toHaveBeenCalledWith('img-uuid-1', 'portada-final.png');
    });
    expect(await screen.findByText('portada-final.png')).toBeInTheDocument();
  });

  it('valida formato y ejecuta Hot-Swap (PUT /api/v1/images/:id) refrescando urlWithVersion', async () => {
    const replaceSpy = vi.spyOn(imagesService, 'replaceImage').mockResolvedValue({
      ...IMAGE_FIXTURE,
      urlWithVersion: 'http://localhost:3000/i/img01?v=9999',
    });

    renderInspector();
    fireEvent.click(await screen.findByRole('button', { name: /Reemplazar \(Hot-Swap\)/i }));

    const fileInput = await screen.findByTestId('hotswap-file-input');

    const badFile = new File(['texto'], 'notas.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Formato no compatible/i);

    const goodFile = new File([new Uint8Array([1, 2, 3])], 'nueva.webp', { type: 'image/webp' });
    fireEvent.change(fileInput, { target: { files: [goodFile] } });
    fireEvent.click(screen.getByTestId('hotswap-confirm-btn'));

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith('img-uuid-1', goodFile);
    });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'portada-editorial.png' })).toHaveAttribute(
        'src',
        'http://localhost:3000/i/img01?variant=original&v=9999'
      );
    });
  });

  it('elimina la imagen tras confirmación inline (DELETE /api/v1/images/:id)', async () => {
    const deleteSpy = vi.spyOn(imagesService, 'deleteImage').mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    renderInspector({ onOpenChange });
    fireEvent.click(await screen.findByRole('button', { name: /Eliminar imagen/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('img-uuid-1');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
