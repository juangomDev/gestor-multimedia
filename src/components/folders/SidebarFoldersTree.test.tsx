import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarFoldersTree, type SidebarFoldersTreeProps } from './SidebarFoldersTree';
import { AuthProvider } from '../../context/AuthContext';
import { storageService } from '../../services/storageService';
import type { FolderItem } from '../../types/media';

const sampleFolders: FolderItem[] = [
  {
    id: 'fld-gen-img',
    name: 'General',
    type: 'image',
    color: '#3b82f6',
    isPrivate: false,
    itemCount: 12,
    userId: 'admin-1',
    myPermission: 'ADMIN',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'fld-priv-img',
    name: 'Campaña VIP',
    type: 'image',
    color: '#ec4899',
    isPrivate: true,
    isShared: true,
    itemCount: 5,
    userId: 'admin-1',
    myPermission: 'EDIT',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'fld-read-tbl',
    name: 'Auditoría 2026',
    type: 'table',
    color: '#10b981',
    isPrivate: true,
    itemCount: 3,
    userId: 'mgr-2',
    myPermission: 'READ',
    createdAt: '2026-01-08T00:00:00.000Z',
  },
];

/**
 * Renderiza `SidebarFoldersTree` dentro de `AuthProvider`.
 */
const renderTree = (props: Partial<SidebarFoldersTreeProps> = {}) =>
  render(
    <AuthProvider>
      <SidebarFoldersTree
        folders={sampleFolders}
        currentMediaCategory="image"
        activeFolderId={null}
        onFolderChange={vi.fn()}
        onOpenNewFolder={vi.fn()}
        onEditFolder={vi.fn()}
        onShareFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        {...props}
      />
    </AuthProvider>
  );

describe('SidebarFoldersTree Component (13.2.2, 13.2.3, 13.2.4)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    storageService.saveSession({
      token: 'mock-admin-token',
      user: { id: 'admin-1', username: 'admin', role: 'ADMIN' },
    });
  });

  it('filters folders by active media category (image vs table) and displays itemCount (13.2.2)', () => {
    const { unmount } = renderTree({ currentMediaCategory: 'image' });

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Campaña VIP')).toBeInTheDocument();
    expect(screen.queryByText('Auditoría 2026')).not.toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    unmount();

    renderTree({ currentMediaCategory: 'table' });
    expect(screen.getByText('Auditoría 2026')).toBeInTheDocument();
    expect(screen.queryByText('Campaña VIP')).not.toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders privacy lock, shared users icon and permission badge (Lectura / Edición) (13.2.3)', () => {
    const { unmount } = renderTree({ currentMediaCategory: 'image' });

    expect(screen.getByLabelText('Carpeta privada')).toBeInTheDocument();
    expect(screen.getByLabelText('Carpeta compartida')).toBeInTheDocument();
    expect(screen.getByText('Edición')).toBeInTheDocument();
    unmount();

    renderTree({ currentMediaCategory: 'table' });
    expect(screen.getByText('Lectura')).toBeInTheDocument();
  });

  it('protects system folder "General" by hiding rename and delete buttons while allowing them on custom folders (13.2.4)', () => {
    const onEditFolder = vi.fn();
    const onShareFolder = vi.fn();
    const onDeleteFolder = vi.fn();

    renderTree({
      currentMediaCategory: 'image',
      onEditFolder,
      onShareFolder,
      onDeleteFolder,
    });

    // Carpeta General protegida contra edición y borrado
    expect(screen.queryByRole('button', { name: 'Editar carpeta General' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar carpeta General' })).not.toBeInTheDocument();

    // Carpeta personalizada "Campaña VIP" permite compartir, editar y eliminar
    const shareBtn = screen.getByRole('button', { name: 'Compartir carpeta Campaña VIP' });
    const editBtn = screen.getByRole('button', { name: 'Editar carpeta Campaña VIP' });
    const deleteBtn = screen.getByRole('button', { name: 'Eliminar carpeta Campaña VIP' });

    fireEvent.click(shareBtn);
    expect(onShareFolder).toHaveBeenCalledWith(sampleFolders[1]);

    fireEvent.click(editBtn);
    expect(onEditFolder).toHaveBeenCalledWith(sampleFolders[1]);

    fireEvent.click(deleteBtn);
    expect(onDeleteFolder).toHaveBeenCalledWith(sampleFolders[1]);
  });
});

