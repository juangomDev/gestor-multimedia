import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../context/ToastContext';
import { ImagesView } from './ImagesView';
import { imagesService } from '../services/imagesService';
import type { ImageItem } from '../types/media';

const makeMockImages = (count: number, folderId?: string | null): ImageItem[] =>
  Array.from({ length: count }, (_, idx) => ({
    id: `img-${idx + 1}`,
    shortCode: `sc-${idx + 1}`,
    originalName: `archivo-${idx + 1}.webp`,
    mimeType: 'image/webp',
    sizeBytes: 10240 * (idx + 1),
    width: 1600,
    height: 900,
    url: `http://localhost:3000/i/sc-${idx + 1}`,
    urlWithVersion: `http://localhost:3000/i/sc-${idx + 1}?v=173033580000${idx}`,
    createdAt: '2026-10-30T12:00:00Z',
    folderId: folderId ?? null,
  }));

describe('ImagesView — Module 14 (WebP Thumbnails, Original Inspector & Pagination)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requests ?variant=thumb&v=... in grid cards and ?variant=original&v=... only when opening ImageInspector', async () => {
    const items = makeMockImages(2);
    vi.spyOn(imagesService, 'fetchRemoteImages').mockResolvedValue(items);

    render(
      <ToastProvider>
        <ImagesView
          images={items}
          activeFolder={null}
          searchQuery=""
          onOpenUpload={vi.fn()}
          onDeleteImage={vi.fn()}
        />
      </ToastProvider>
    );

    // 14.1.1 & 14.1.3 Grid thumbnail uses ?variant=thumb&v=...
    const cardImg = screen.getByRole('img', { name: 'archivo-1.webp' }) as HTMLImageElement;
    expect(cardImg.src).toContain('/i/sc-1?variant=thumb&v=1730335800000');

    // 14.1.2 Open ImageInspector -> loads ?variant=original&v=...
    await act(async () => {
      fireEvent.click(screen.getByTestId('image-card-sc-1'));
    });

    const allImgs = screen.getAllByRole('img', { name: 'archivo-1.webp' }) as HTMLImageElement[];
    const inspectorImg = allImgs.find((el) => el.src.includes('variant=original'));
    expect(inspectorImg).toBeDefined();
    expect(inspectorImg?.src).toContain('/i/sc-1?variant=original&v=1730335800000');

    // 14.3.4 Shows dimensions in inspector
    expect(screen.getByText(/1600 × 900 px/i)).toBeInTheDocument();
  });

  it('calls fetchRemoteImages({ page, limit, folderId }) and renders pagination controls when images exceed pageLimit', async () => {
    const items = makeMockImages(5, 'folder-marketing');
    const fetchSpy = vi.spyOn(imagesService, 'fetchRemoteImages').mockResolvedValue(items);

    render(
      <ToastProvider>
        <ImagesView
          images={items}
          activeFolder={{
            id: 'folder-marketing',
            name: 'Marketing',
            type: 'image',
            createdAt: '2026-10-30T00:00:00Z',
          }}
          searchQuery=""
          onOpenUpload={vi.fn()}
          onDeleteImage={vi.fn()}
          pageLimit={2}
        />
      </ToastProvider>
    );

    expect(fetchSpy).toHaveBeenCalledWith({
      page: 1,
      limit: 2,
      folderId: 'folder-marketing',
    });

    // Pagination bar is visible (5 items with pageLimit=2 -> 3 pages)
    expect(screen.getByTestId('gallery-pagination')).toBeInTheDocument();
    expect(screen.getByText(/Página 1 de 3/i)).toBeInTheDocument();

    // Page 1 shows items 1 and 2, not item 3
    expect(screen.getByText('archivo-1.webp')).toBeInTheDocument();
    expect(screen.getByText('archivo-2.webp')).toBeInTheDocument();
    expect(screen.queryByText('archivo-3.webp')).not.toBeInTheDocument();

    // Navigate to Page 2
    const nextBtn = screen.getByRole('button', { name: /Página siguiente/i });
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    expect(screen.getByText(/Página 2 de 3/i)).toBeInTheDocument();
    expect(screen.getByText('archivo-3.webp')).toBeInTheDocument();
    expect(screen.getByText('archivo-4.webp')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith({
      page: 2,
      limit: 2,
      folderId: 'folder-marketing',
    });
  });
});
