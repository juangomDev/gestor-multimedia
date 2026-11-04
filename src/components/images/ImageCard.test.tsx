import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../../context/ToastContext';
import { ImageCard } from './ImageCard';
import * as clipboardModule from '../../utils/clipboard';
import type { ImageItem } from '../../types/media';

const mockImage: ImageItem = {
  id: 'img-test-1',
  shortCode: 'sc-12345',
  originalName: 'nature-wallpaper.png',
  mimeType: 'image/png',
  sizeBytes: 204800, // 200 KB
  url: 'http://localhost:3000/i/sc-12345',
  createdAt: '2026-10-30T12:00:00.000Z',
};

const renderCard = (props: Partial<React.ComponentProps<typeof ImageCard>> = {}) => {
  const onOpenInspector = vi.fn();
  const onDelete = vi.fn();
  const onMoveToFolder = vi.fn();

  const utils = render(
    <ToastProvider>
      <ImageCard
        image={mockImage}
        onOpenInspector={onOpenInspector}
        onDelete={onDelete}
        onMoveToFolder={onMoveToFolder}
        {...props}
      />
    </ToastProvider>
  );

  return {
    ...utils,
    onOpenInspector,
    onDelete,
    onMoveToFolder,
  };
};

describe('ImageCard Component (Minimalist Studio Design)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders exactly the 3 essential elements: thumbnail, shortCode badge, and file name', () => {
    renderCard();

    // 1. Thumbnail
    const img = screen.getByRole('img', { name: mockImage.originalName });
    expect(img).toBeInTheDocument();

    // 2. ShortCode badge
    const badge = screen.getByRole('button', { name: `Copiar código ${mockImage.shortCode}` });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(mockImage.shortCode);

    // 3. File name
    const fileName = screen.getByText(mockImage.originalName);
    expect(fileName).toBeInTheDocument();
    expect(fileName).toHaveAttribute('title', mockImage.originalName);
  });

  it('does NOT render secondary metadata (size in KB and creation date)', () => {
    renderCard();

    // Verify absence of secondary metadata
    expect(screen.queryByText(/200\s?KB/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2026/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/oct/i)).not.toBeInTheDocument();
  });

  it('copies shortCode to clipboard on 1-click on the badge without opening the inspector', async () => {
    const copySpy = vi.spyOn(clipboardModule, 'copyToClipboard').mockResolvedValue(true);
    const { onOpenInspector } = renderCard();

    const badge = screen.getByRole('button', { name: `Copiar código ${mockImage.shortCode}` });
    await act(async () => {
      fireEvent.click(badge);
    });

    expect(copySpy).toHaveBeenCalledWith(mockImage.shortCode);
    expect(onOpenInspector).not.toHaveBeenCalled();
  });

  it('opens inspector when clicking on the card body', () => {
    const { onOpenInspector } = renderCard();

    const card = screen.getByTestId(`image-card-${mockImage.shortCode}`);
    fireEvent.click(card);

    expect(onOpenInspector).toHaveBeenCalledWith(mockImage);
  });

  it('triggers action buttons: preview, copy URL, move to folder, and delete', async () => {
    const copySpy = vi.spyOn(clipboardModule, 'copyToClipboard').mockResolvedValue(true);
    const { onOpenInspector, onDelete, onMoveToFolder } = renderCard();

    // Preview button
    const previewBtn = screen.getByRole('button', { name: 'Previsualizar' });
    fireEvent.click(previewBtn);
    expect(onOpenInspector).toHaveBeenCalledWith(mockImage);

    // Copy URL button
    const copyUrlBtn = screen.getByRole('button', { name: 'Copiar URL' });
    await act(async () => {
      fireEvent.click(copyUrlBtn);
    });
    expect(copySpy).toHaveBeenCalledWith(mockImage.url);

    // Move to folder button
    const moveBtn = screen.getByRole('button', { name: 'Mover a carpeta' });
    fireEvent.click(moveBtn);
    expect(onMoveToFolder).toHaveBeenCalledWith(mockImage);

    // Delete button
    const deleteBtn = screen.getByRole('button', { name: 'Eliminar' });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(mockImage);
  });
});
