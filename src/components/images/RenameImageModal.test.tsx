import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../../context/ToastContext';
import { RenameImageModal } from './RenameImageModal';
import { imagesService } from '../../services/imagesService';
import type { ImageItem } from '../../types/media';

const mockImage: ImageItem = {
  id: 'img-rename-1',
  shortCode: 'ren123',
  originalName: 'foto-original.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 32000,
  url: 'http://localhost:3000/i/ren123',
  createdAt: '2026-10-30T10:00:00Z',
};

describe('RenameImageModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('displays current shortCode and submits new image name via imagesService.renameImage', async () => {
    const renameSpy = vi.spyOn(imagesService, 'renameImage').mockResolvedValue({
      ...mockImage,
      originalName: 'portada-2026.jpg',
    });
    const onClose = vi.fn();
    const onImageRenamed = vi.fn();

    render(
      <ToastProvider>
        <RenameImageModal
          image={mockImage}
          isOpen={true}
          onClose={onClose}
          onImageRenamed={onImageRenamed}
        />
      </ToastProvider>
    );

    expect(screen.getByText('ren123')).toBeInTheDocument();
    const input = screen.getByLabelText(/Nuevo nombre del archivo/i) as HTMLInputElement;
    expect(input.value).toBe('foto-original.jpg');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'portada-2026.jpg' } });
    });

    const saveBtn = screen.getByRole('button', { name: /Guardar Nombre/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(renameSpy).toHaveBeenCalledWith('img-rename-1', 'portada-2026.jpg');
    expect(onImageRenamed).toHaveBeenCalledWith(
      expect.objectContaining({ originalName: 'portada-2026.jpg' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

