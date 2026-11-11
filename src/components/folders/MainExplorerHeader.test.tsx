import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainExplorerHeader } from './MainExplorerHeader';
import { Sidebar } from '../layout/Sidebar';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import type { FolderItem } from '../../types/media';

const mockFolders: FolderItem[] = [
  {
    id: 'fld-img-1',
    name: 'Campaña Visual',
    type: 'image',
    color: '#3b82f6',
    isPrivate: false,
    itemCount: 7,
    createdAt: '2026-11-10T00:00:00Z',
  },
  {
    id: 'fld-tbl-1',
    name: 'Balances 2026',
    type: 'table',
    color: '#10b981',
    isPrivate: true,
    itemCount: 4,
    createdAt: '2026-11-10T00:00:00Z',
  },
];

describe('Rediseño Explorador Principal en <main> y Menú Lateral Minimalista', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('oculta Imágenes, Tablas, PDFs y Formularios del Sidebar en explorerMode y deja Subir Archivo y Data Chat', () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'token-admin',
      user: { id: '1', username: 'admin', role: 'ADMIN' },
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <Sidebar
            activeView="images"
            onViewChange={vi.fn()}
            onOpenUpload={vi.fn()}
            onSync={vi.fn()}
            imagesCount={5}
            tablesCount={3}
            pdfsCount={2}
            explorerMode={true}
          />
        </ToastProvider>
      </AuthProvider>
    );

    expect(screen.getByRole('button', { name: /Subir Archivo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explorador Principal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Consulta Inteligente \(Data Chat\)/i })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Galería de Imágenes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Data Studio \(Tablas\)/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Documentos PDF/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Formularios/i })).not.toBeInTheDocument();
  });

  it('restringe las opciones de Configuración exclusivamente al rol ADMIN en explorerMode', () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'token-mgr',
      user: { id: '2', username: 'manager_user', role: 'MANAGER' },
    });

    const { unmount } = render(
      <AuthProvider>
        <ToastProvider>
          <Sidebar
            activeView="images"
            onViewChange={vi.fn()}
            onOpenUpload={vi.fn()}
            onSync={vi.fn()}
            imagesCount={5}
            tablesCount={3}
            explorerMode={true}
          />
        </ToastProvider>
      </AuthProvider>
    );

    expect(screen.queryByText('Configuración API')).not.toBeInTheDocument();
    expect(screen.queryByText('Sincronizar Base de Datos')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestión de Perfiles')).not.toBeInTheDocument();
    expect(screen.queryByText('Registro de Auditoría')).not.toBeInTheDocument();
    unmount();

    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'token-admin',
      user: { id: '1', username: 'admin_user', role: 'ADMIN' },
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <Sidebar
            activeView="images"
            onViewChange={vi.fn()}
            onOpenUpload={vi.fn()}
            onSync={vi.fn()}
            imagesCount={5}
            tablesCount={3}
            explorerMode={true}
          />
        </ToastProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Configuración API')).toBeInTheDocument();
    expect(screen.getByText('Sincronizar Base de Datos')).toBeInTheDocument();
    expect(screen.getByText('Gestión de Perfiles')).toBeInTheDocument();
    expect(screen.getByText('Registro de Auditoría')).toBeInTheDocument();
  });

  it('renderiza las carpetas directamente en MainExplorerHeader dentro de <main> y navega con breadcrumbs', () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'token-admin',
      user: { id: '1', username: 'admin', role: 'ADMIN' },
    });

    const onFolderChange = vi.fn();
    const onViewChange = vi.fn();

    render(
      <AuthProvider>
        <MainExplorerHeader
          activeView="all"
          onViewChange={onViewChange}
          folders={mockFolders}
          activeFolder={mockFolders[0]}
          activeFolderId="fld-img-1"
          onFolderChange={onFolderChange}
          onOpenNewFolder={vi.fn()}
          onEditFolder={vi.fn()}
          onShareFolder={vi.fn()}
          onDeleteFolder={vi.fn()}
          imagesCount={10}
          tablesCount={4}
          pdfsCount={2}
        />
      </AuthProvider>
    );

    expect(screen.getByTestId('main-folders-section')).toBeInTheDocument();
    expect(screen.getAllByText('Campaña Visual').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Balances 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Balances 2026'));
    expect(onViewChange).toHaveBeenCalledWith('tables');
    expect(onFolderChange).toHaveBeenCalledWith('fld-tbl-1');
  });
});

