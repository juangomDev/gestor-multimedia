import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar, type SidebarProps } from './Sidebar';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import type { FolderItem } from '../../types/media';

const mockFolders: FolderItem[] = [
  {
    id: 'fld-img-1',
    name: 'Campaña 2026',
    type: 'image',
    color: '#3b82f6',
    itemCount: 4,
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'fld-tbl-1',
    name: 'Reportes Financieros',
    type: 'table',
    color: '#10b981',
    itemCount: 2,
    createdAt: '2026-11-01T10:00:00Z',
  },
];

const renderSidebarWithAuth = (props: Partial<SidebarProps> = {}) => {
  return render(
    <AuthProvider>
      <ToastProvider>
        <Sidebar
          activeView="images"
          onViewChange={vi.fn()}
          onOpenUpload={vi.fn()}
          onSync={vi.fn()}
          imagesCount={10}
          tablesCount={5}
          {...props}
        />
      </ToastProvider>
    </AuthProvider>
  );
};

describe('Sidebar Component - Folders & RBAC Visibility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders image folders when foldersEnabled is true and triggers folder callbacks', () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'mock-token',
      user: { id: '1', username: 'admin', role: 'ADMIN' },
    });

    const onFolderChange = vi.fn();
    const onOpenNewFolder = vi.fn();

    renderSidebarWithAuth({
      activeView: 'images',
      foldersEnabled: true,
      folders: mockFolders,
      activeFolderId: null,
      onFolderChange,
      onOpenNewFolder,
    });

    expect(screen.getByTestId('sidebar-folders-section')).toBeInTheDocument();
    expect(screen.getByText('Campaña 2026')).toBeInTheDocument();
    expect(screen.queryByText('Reportes Financieros')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Campaña 2026'));
    expect(onFolderChange).toHaveBeenCalledWith('fld-img-1');

    fireEvent.click(screen.getByRole('button', { name: /Nueva carpeta/i }));
    expect(onOpenNewFolder).toHaveBeenCalledTimes(1);
  });

  it('shows Gestión de Perfiles for MANAGER and hides it for COLLABORATOR', () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'mock-mgr-token',
      user: { id: '2', username: 'mgr_user', role: 'MANAGER' },
    });

    const { unmount } = renderSidebarWithAuth();
    expect(screen.getByText('Gestión de Perfiles')).toBeInTheDocument();
    unmount();

    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'mock-col-token',
      user: { id: '3', username: 'col_user', role: 'COLLABORATOR' },
    });

    renderSidebarWithAuth();
    expect(screen.queryByText('Gestión de Perfiles')).not.toBeInTheDocument();
  });
});

