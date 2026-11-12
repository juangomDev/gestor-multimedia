import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  foldersService,
  flattenFolderTree,
  getFolderPathLabel,
} from './foldersService';
import { apiClient } from './apiClient';
import { authService } from './authService';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { FolderGridCard } from '../components/folders/FolderGridCard';
import { MainExplorerHeader } from '../components/folders/MainExplorerHeader';
import { UnifiedExplorerView } from '../views/UnifiedExplorerView';
import { MoveToFolderModal } from '../components/folders/MoveToFolderModal';
import { BulkMoveModal } from '../components/common/BulkMoveModal';
import type { FolderItem } from '../types/media';

describe('Módulo 25 — Jerarquía de Carpetas en 3 Niveles (CONTAINER, parentId, /folders/tree) y Bóveda shared', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('fetchFolderTree() consume GET /api/v1/folders/tree y aplana/construye rutas de 3 niveles', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      tree: [
        {
          id: 'fld-shared',
          name: 'shared',
          type: 'CONTAINER',
          parentId: null,
          isSystem: true,
          children: [],
        },
        {
          id: 'fld-mgr-1',
          name: 'juan',
          type: 'CONTAINER',
          parentId: null,
          isSystem: true,
          children: [
            {
              id: 'fld-lvl2-img',
              name: 'Campañas 2026',
              type: 'IMAGE',
              parentId: 'fld-mgr-1',
              isSystem: false,
              children: [
                {
                  id: 'fld-lvl3-img',
                  name: 'Banners Q4',
                  type: 'IMAGE',
                  parentId: 'fld-lvl2-img',
                  isSystem: false,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
      total: 4,
    });

    const tree = await foldersService.fetchFolderTree();
    expect(getSpy).toHaveBeenCalledWith('/api/v1/folders/tree');
    expect(tree).toHaveLength(2);
    expect(tree[0].type).toBe('container');
    expect(tree[0].isSystem).toBe(true);

    const flat = flattenFolderTree(tree);
    expect(flat).toHaveLength(4);

    const lvl3 = flat.find((f) => f.id === 'fld-lvl3-img')!;
    expect(lvl3.parentId).toBe('fld-lvl2-img');
    expect(getFolderPathLabel(lvl3, flat)).toBe('juan › Campañas 2026 › Banners Q4');
  });

  it('fetchFolders() envía parentId en query string y createFolder() soporta CONTAINER y parentId', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ folders: [] });
    await foldersService.fetchFolders('IMAGE', undefined, undefined, undefined, 'fld-mgr-1');
    expect(getSpy).toHaveBeenCalledWith('/api/v1/folders?type=IMAGE&parentId=fld-mgr-1');

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      folder: {
        id: 'fld-sub-new',
        name: 'Reportes Mensuales',
        type: 'TABLE',
        parentId: 'fld-mgr-1',
      },
    });

    const created = await foldersService.createFolder({
      name: 'Reportes Mensuales',
      type: 'table',
      parentId: 'fld-mgr-1',
      color: '#10b981',
      isPrivate: false,
    });

    expect(postSpy).toHaveBeenCalledWith('/api/v1/folders', {
      name: 'Reportes Mensuales',
      type: 'TABLE',
      parentId: 'fld-mgr-1',
      color: '#10b981',
      isPrivate: false,
    });
    expect(created.parentId).toBe('fld-mgr-1');
    expect(created.type).toBe('table');
  });

  it('destaca la carpeta del sistema shared con badge "Sistema · Compartida" y oculta Editar/Eliminar', () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'token-admin',
      user: { id: '1', username: 'admin', role: 'ADMIN' },
    });

    const sharedFolder: FolderItem = {
      id: 'fld-shared',
      name: 'shared',
      type: 'container',
      parentId: null,
      isSystem: true,
      createdAt: '2026-11-11T00:00:00Z',
    };

    render(
      <AuthProvider>
        <FolderGridCard
          folder={sharedFolder}
          onOpenFolder={vi.fn()}
          onEditFolder={vi.fn()}
          onShareFolder={vi.fn()}
          onDeleteFolder={vi.fn()}
        />
      </AuthProvider>
    );

    expect(screen.getByText('Sistema · Compartida')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar carpeta shared/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar carpeta shared/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartir carpeta shared/i })).toBeInTheDocument();
  });

  it('deshabilita "Nueva subcarpeta" al alcanzar el Nivel 3 de profundidad y muestra banner en carpetas CONTAINER', () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'token-admin',
      user: { id: '1', username: 'admin', role: 'ADMIN' },
    });

    const folders: FolderItem[] = [
      { id: 'f1', name: 'juan', type: 'container', parentId: null, createdAt: '2026-11-11T00:00:00Z' },
      { id: 'f2', name: 'Fotos', type: 'image', parentId: 'f1', createdAt: '2026-11-11T00:00:00Z' },
      { id: 'f3', name: 'Eventos', type: 'image', parentId: 'f2', createdAt: '2026-11-11T00:00:00Z' },
    ];

    render(
      <AuthProvider>
        <ToastProvider>
          <MainExplorerHeader
            activeView="images"
            onViewChange={vi.fn()}
            folders={folders}
            activeFolder={folders[2]}
            activeFolderId="f3"
            onFolderChange={vi.fn()}
            onOpenNewFolder={vi.fn()}
            onEditFolder={vi.fn()}
            onShareFolder={vi.fn()}
            onDeleteFolder={vi.fn()}
            imagesCount={0}
            tablesCount={0}
            pdfsCount={0}
            compactHeaderOnly={true}
          />
          <UnifiedExplorerView
            folders={folders}
            activeFolder={folders[0]}
            images={[]}
            tables={[]}
            pdfsCount={0}
            searchQuery=""
            onSearchChange={vi.fn()}
            onOpenUpload={vi.fn()}
            onDeleteImage={vi.fn()}
            onDeleteTable={vi.fn()}
            onOpenStudio={vi.fn()}
            onViewChange={vi.fn()}
          />
        </ToastProvider>
      </AuthProvider>
    );

    const newSubfolderBtn = screen.getByRole('button', { name: /Nueva carpeta/i });
    expect(newSubfolderBtn).toBeDisabled();
    expect(screen.getByTestId('container-folder-banner')).toBeInTheDocument();
  });

  it('muestra rutas jerárquicas de 3 niveles en MoveToFolderModal y BulkMoveModal excluyendo carpetas CONTAINER', () => {
    const allFolders: FolderItem[] = [
      { id: 'f1', name: 'juan', type: 'container', parentId: null, createdAt: '2026-11-11T00:00:00Z' },
      { id: 'f2', name: 'Campañas', type: 'image', parentId: 'f1', createdAt: '2026-11-11T00:00:00Z' },
      { id: 'f3', name: 'Redes Sociales', type: 'image', parentId: 'f2', createdAt: '2026-11-11T00:00:00Z' },
    ];

    const onMove = vi.fn();
    render(
      <>
        <MoveToFolderModal
          isOpen={true}
          onClose={vi.fn()}
          itemName="banner.png"
          currentFolderId={null}
          folders={allFolders}
          allFolders={allFolders}
          onMove={onMove}
        />
        <BulkMoveModal
          isOpen={true}
          onClose={vi.fn()}
          selectedCount={3}
          category="image"
          folders={allFolders}
          onConfirm={vi.fn().mockResolvedValue(undefined)}
        />
      </>
    );

    expect(screen.getAllByText('juan › Campañas › Redes Sociales').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getAllByText('juan › Campañas › Redes Sociales')[0]);
    expect(onMove).toHaveBeenCalledWith('f3');
  });
});

