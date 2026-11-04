import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../context/ToastContext';
import { ImagesView } from './ImagesView';
import type { ImageItem } from '../types/media';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const mockImages: ImageItem[] = [
  {
    id: 'img-1',
    shortCode: 'code-png',
    originalName: 'logo.png',
    mimeType: 'image/png',
    sizeBytes: 12000,
    url: 'http://localhost/code-png',
    createdAt: '2026-10-30T00:00:00Z',
  },
  {
    id: 'img-2',
    shortCode: 'code-jpg',
    originalName: 'banner.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 45000,
    url: 'http://localhost/code-jpg',
    createdAt: '2026-10-30T00:00:00Z',
  },
  {
    id: 'img-3',
    shortCode: 'code-webp',
    originalName: 'hero.webp',
    mimeType: 'image/webp',
    sizeBytes: 25000,
    url: 'http://localhost/code-webp',
    createdAt: '2026-10-30T00:00:00Z',
  },
  {
    id: 'img-4',
    shortCode: 'code-svg',
    originalName: 'vector-icon.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: 8000,
    url: 'http://localhost/code-svg',
    createdAt: '2026-10-30T00:00:00Z',
  },
];

describe('ImagesView Component', () => {
  it('renders header, title, search box, format pills, and upload button', () => {
    const onOpenUpload = vi.fn();
    renderWithProviders(
      <ImagesView
        images={mockImages}
        activeFolder={null}
        searchQuery=""
        onSearchChange={vi.fn()}
        onOpenUpload={onOpenUpload}
        onDeleteImage={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /Galería de Imágenes/i })).toBeInTheDocument();
    expect(screen.getByText(/Todas las imágenes registradas en el backend \(4\)/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar imagen o código\.\.\./i)).toBeInTheDocument();

    // Verify format tabs including SVG
    expect(screen.getByRole('tab', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'PNG' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'JPG' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'WEBP' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'SVG' })).toBeInTheDocument();

    // Verify quick upload button
    const uploadBtn = screen.getByRole('button', { name: /Subir/i });
    expect(uploadBtn).toBeInTheDocument();
    fireEvent.click(uploadBtn);
    expect(onOpenUpload).toHaveBeenCalledTimes(1);
  });

  it('filters by format when clicking format tabs (e.g. SVG, PNG, JPG, WEBP)', () => {
    renderWithProviders(
      <ImagesView
        images={mockImages}
        activeFolder={null}
        searchQuery=""
        onSearchChange={vi.fn()}
        onOpenUpload={vi.fn()}
        onDeleteImage={vi.fn()}
      />
    );

    // Initial state: all 4 are visible
    expect(screen.getByText('logo.png')).toBeInTheDocument();
    expect(screen.getByText('vector-icon.svg')).toBeInTheDocument();

    // Click SVG
    fireEvent.click(screen.getByRole('tab', { name: 'SVG' }));
    expect(screen.getByText('vector-icon.svg')).toBeInTheDocument();
    expect(screen.queryByText('logo.png')).not.toBeInTheDocument();
    expect(screen.queryByText('banner.jpg')).not.toBeInTheDocument();

    // Click PNG
    fireEvent.click(screen.getByRole('tab', { name: 'PNG' }));
    expect(screen.getByText('logo.png')).toBeInTheDocument();
    expect(screen.queryByText('vector-icon.svg')).not.toBeInTheDocument();

    // Click Todos
    fireEvent.click(screen.getByRole('tab', { name: 'Todos' }));
    expect(screen.getByText('logo.png')).toBeInTheDocument();
    expect(screen.getByText('vector-icon.svg')).toBeInTheDocument();
  });

  it('filters by search query', () => {
    const onSearchChange = vi.fn();
    renderWithProviders(
      <ImagesView
        images={mockImages}
        activeFolder={null}
        searchQuery="vector"
        onSearchChange={onSearchChange}
        onOpenUpload={vi.fn()}
        onDeleteImage={vi.fn()}
      />
    );

    expect(screen.getByText('vector-icon.svg')).toBeInTheDocument();
    expect(screen.queryByText('logo.png')).not.toBeInTheDocument();
  });
});
