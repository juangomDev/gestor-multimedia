import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../../context/ToastContext';
import { HotSwapImageModal } from './HotSwapImageModal';
import { imagesService } from '../../services/imagesService';
import type { ImageItem } from '../../types/media';

const mockImage: ImageItem = {
  id: 'img-swap-1',
  shortCode: 'swp999',
  originalName: 'diagrama-v1.png',
  mimeType: 'image/png',
  sizeBytes: 51200,
  width: 1280,
  height: 720,
  url: 'http://localhost:3000/i/swp999',
  createdAt: '2026-10-30T10:00:00Z',
};

describe('HotSwapImageModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders before/after comparison, required invariant shortCode warning, and submits replacement binary', async () => {
    const replaceSpy = vi.spyOn(imagesService, 'replaceImage').mockResolvedValue({
      ...mockImage,
      sizeBytes: 24576,
      width: 1920,
      height: 1080,
      urlWithVersion: 'http://localhost:3000/i/swp999?v=1730340000000',
    });

    const onClose = vi.fn();
    const onImageReplaced = vi.fn();

    render(
      <ToastProvider>
        <HotSwapImageModal
          image={mockImage}
          isOpen={true}
          onClose={onClose}
          onImageReplaced={onImageReplaced}
        />
      </ToastProvider>
    );

    // 14.3.3 Required warning text
    expect(
      screen.getByText(
        /El archivo se actualizará conservando exactamente el mismo shortCode y URL pública compartida/i
      )
    ).toBeInTheDocument();

    // Current file info
    expect(screen.getByText('diagrama-v1.png')).toBeInTheDocument();
    expect(screen.getByText(/1280×720px/i)).toBeInTheDocument();

    // Select new file in dropzone input
    const fileInput = screen.getByTestId('hotswap-file-input');
    const newFile = new File(['new-binary-content'], 'diagrama-v2.webp', {
      type: 'image/webp',
    });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [newFile] } });
    });

    // Verify "After" panel shows new file name
    expect(screen.getByText('diagrama-v2.webp')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Reemplazar Binario/i });
    expect(submitBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(replaceSpy).toHaveBeenCalledWith('img-swap-1', newFile);
    expect(onImageReplaced).toHaveBeenCalledWith(
      expect.objectContaining({
        shortCode: 'swp999',
        width: 1920,
        height: 1080,
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

