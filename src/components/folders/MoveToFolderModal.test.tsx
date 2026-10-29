import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoveToFolderModal } from './MoveToFolderModal';
import type { FolderItem } from '../../types/media';

describe('MoveToFolderModal', () => {
  const mockFolders: FolderItem[] = [
    {
      id: 'folder-1',
      name: 'Marketing 2026',
      type: 'image',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'folder-2',
      name: 'Banners Web',
      type: 'image',
      createdAt: '2026-01-02T00:00:00.000Z',
    },
  ];

  it('renders modal with root and existing folders', () => {
    render(
      <MoveToFolderModal
        isOpen={true}
        onClose={vi.fn()}
        itemName="hero-banner.png"
        currentFolderId={null}
        folders={mockFolders}
        onMove={vi.fn()}
      />
    );

    expect(screen.getByText('Mover "hero-banner.png" a carpeta')).toBeDefined();
    expect(screen.getByText('Sin carpeta (Raíz principal)')).toBeDefined();
    expect(screen.getByText('Marketing 2026')).toBeDefined();
    expect(screen.getByText('Banners Web')).toBeDefined();
  });

  it('triggers onMove and onClose when a folder is selected', async () => {
    const onMove = vi.fn();
    const onClose = vi.fn();

    render(
      <MoveToFolderModal
        isOpen={true}
        onClose={onClose}
        itemName="hero-banner.png"
        currentFolderId={null}
        folders={mockFolders}
        onMove={onMove}
      />
    );

    const targetFolderBtn = screen.getByText('Marketing 2026');
    await userEvent.click(targetFolderBtn);

    expect(onMove).toHaveBeenCalledWith('folder-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('triggers onMove with null when selecting root option', async () => {
    const onMove = vi.fn();
    const onClose = vi.fn();

    render(
      <MoveToFolderModal
        isOpen={true}
        onClose={onClose}
        itemName="hero-banner.png"
        currentFolderId="folder-1"
        folders={mockFolders}
        onMove={onMove}
      />
    );

    const rootBtn = screen.getByText('Sin carpeta (Raíz principal)');
    await userEvent.click(rootBtn);

    expect(onMove).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalled();
  });
});
