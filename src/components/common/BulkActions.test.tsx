import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BulkActionBar } from './BulkActionBar';
import { BulkDeleteModal } from './BulkDeleteModal';
import { BulkMoveModal } from './BulkMoveModal';
import type { FolderItem } from '../../types/media';

describe('Bulk Actions Components (Módulo 19)', () => {
  it('BulkActionBar renders selection count and handles actions', () => {
    const onClear = vi.fn();
    const onSelectAll = vi.fn();
    const onMove = vi.fn();
    const onDelete = vi.fn();

    const { rerender } = render(
      <BulkActionBar
        selectedCount={0}
        totalCount={10}
        onClearSelection={onClear}
        onSelectAll={onSelectAll}
        onOpenBulkMove={onMove}
        onOpenBulkDelete={onDelete}
        itemLabel="imágenes"
      />
    );

    // If selectedCount is 0, bar is hidden
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    rerender(
      <BulkActionBar
        selectedCount={3}
        totalCount={10}
        onClearSelection={onClear}
        onSelectAll={onSelectAll}
        onOpenBulkMove={onMove}
        onOpenBulkDelete={onDelete}
        itemLabel="imágenes"
      />
    );

    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/de 10 imágenes/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Todos/i }));
    expect(onSelectAll).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Mover/i }));
    expect(onMove).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText(/Cancelar selección/i));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('BulkDeleteModal confirms destructive bulk deletion', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <BulkDeleteModal
        isOpen={true}
        onClose={onClose}
        selectedCount={5}
        itemLabel="imágenes"
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('heading', { name: /Eliminar 5 imágenes en lote/i })).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /Eliminar 5 imágenes/i });
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('BulkMoveModal lists compatible folders and confirms bulk move', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const mockFolders: FolderItem[] = [
      { id: 'fld-img-1', name: 'Fotos 2026', type: 'image', itemCount: 10, createdAt: '' },
      { id: 'fld-tbl-1', name: 'Tablas 2026', type: 'table', itemCount: 4, createdAt: '' },
    ];

    render(
      <BulkMoveModal
        isOpen={true}
        onClose={onClose}
        selectedCount={4}
        category="image"
        folders={mockFolders}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('heading', { name: /Mover 4 imágenes en lote/i })).toBeInTheDocument();
    // Only image folders shown
    expect(screen.getByText('Fotos 2026')).toBeInTheDocument();
    expect(screen.queryByText('Tablas 2026')).not.toBeInTheDocument();

    const folderOption = screen.getByText('Fotos 2026').closest('button');
    expect(folderOption).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(folderOption!);
    });

    const moveBtn = screen.getByRole('button', { name: /Mover 4 elementos/i });
    expect(moveBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(moveBtn);
    });

    expect(onConfirm).toHaveBeenCalledWith('fld-img-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

