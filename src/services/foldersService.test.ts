import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  foldersService,
  flattenFolderTree,
  getFolderDepth,
  getFolderPathLabel,
} from './foldersService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('FoldersService (v2 — CRUD, Árbol 3 niveles /tree, Move y Compartición)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.resetCache();
  });

  it('fetchFolders() consulta GET /api/v1/folders con filtros (type, search, page, limit, parentId)', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      folders: [
        {
          id: 'fld-1',
          name: 'General',
          type: 'IMAGE',
          isPrivate: false,
          itemCount: 8,
          myPermission: 'ADMIN',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'fld-2',
          name: 'Finanzas 2026',
          type: 'TABLE',
          isPrivate: true,
          itemCount: 3,
          myPermission: 'EDIT',
          createdAt: '2026-01-05T00:00:00.000Z',
        },
      ],
      total: 2,
    });

    const folders = await foldersService.fetchFolders();
    expect(getSpy).toHaveBeenCalledWith('/api/v1/folders');
    expect(folders).toHaveLength(2);
    expect(folders[0].type).toBe('image');
    expect(folders[1].isPrivate).toBe(true);

    await foldersService.fetchFolders('TABLE', 'Finanzas', 1, 20, 'fld-l1');
    expect(getSpy).toHaveBeenCalledWith(
      '/api/v1/folders?type=TABLE&search=Finanzas&page=1&limit=20&parentId=fld-l1'
    );
  });

  it('fetchFolderTree() normaliza shared (isSystem) y calcula profundidad 0..3 y rutas', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      tree: [
        {
          id: 'fld-shared',
          name: 'shared',
          type: 'CONTAINER',
          parentId: null,
          isSystem: true,
          myPermission: 'READ',
          children: [],
        },
        {
          id: 'fld-l1',
          name: 'Proyectos 2026',
          type: 'CONTAINER',
          parentId: null,
          isSystem: false,
          myPermission: 'ADMIN',
          children: [
            {
              id: 'fld-l2',
              name: 'Campañas',
              type: 'IMAGE',
              parentId: 'fld-l1',
              isSystem: false,
              myPermission: 'EDIT',
              children: [
                {
                  id: 'fld-l3',
                  name: 'Banners Q4',
                  type: 'IMAGE',
                  parentId: 'fld-l2',
                  isSystem: false,
                  myPermission: 'EDIT',
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
    expect(tree[0].isSystem).toBe(true);

    const flat = flattenFolderTree(tree);
    expect(flat).toHaveLength(4);
    expect(getFolderDepth(null, flat)).toBe(0);
    expect(getFolderDepth('fld-l1', flat)).toBe(1);
    expect(getFolderDepth('fld-l2', flat)).toBe(2);
    expect(getFolderDepth('fld-l3', flat)).toBe(3);

    const lvl3 = flat.find((f) => f.id === 'fld-l3')!;
    expect(getFolderPathLabel(lvl3, flat)).toBe('Proyectos 2026 › Campañas › Banners Q4');
  });

  it('getFolderById(), createFolder() con parentId, updateFolder() y deleteFolder()', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      folder: { id: 'fld-10', name: 'Campaña Verano', type: 'IMAGE', itemCount: 15 },
    });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      folder: { id: 'fld-new', name: 'Finanzas', type: 'TABLE', parentId: 'fld-l1', isPrivate: true },
    });
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      folder: { id: 'fld-edit', name: 'Nuevo Nombre', type: 'IMAGE', color: '#10b981', isPrivate: true },
    });
    const delSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({
      message: 'Eliminada',
      deletedCount: 2,
    });

    const detail = await foldersService.getFolderById('fld-10');
    expect(getSpy).toHaveBeenCalledWith('/api/v1/folders/fld-10');
    expect(detail.itemCount).toBe(15);

    const created = await foldersService.createFolder({
      name: 'Finanzas',
      type: 'table',
      parentId: 'fld-l1',
      isPrivate: true,
    });
    expect(postSpy).toHaveBeenCalledWith('/api/v1/folders', {
      name: 'Finanzas',
      type: 'TABLE',
      color: undefined,
      isPrivate: true,
      parentId: 'fld-l1',
    });
    expect(created.parentId).toBe('fld-l1');

    const updated = await foldersService.updateFolder('fld-edit', {
      name: 'Nuevo Nombre',
      color: '#10b981',
      isPrivate: true,
    });
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/folders/fld-edit', {
      name: 'Nuevo Nombre',
      color: '#10b981',
      isPrivate: true,
    });
    expect(updated.name).toBe('Nuevo Nombre');

    const deleted = await foldersService.deleteFolder('fld-del');
    expect(delSpy).toHaveBeenCalledWith('/api/v1/folders/fld-del');
    expect(deleted.deletedCount).toBe(2);
  });

  it('moveImageToFolder() y moveTableToFolder() reasignan activos vía PATCH', async () => {
    const patchSpy = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValueOnce({ image: { id: 'img-1', folderId: 'fld-img' } })
      .mockResolvedValueOnce({ table: { id: 'tbl-1', folderId: 'fld-tbl' } });

    const imgRes = await foldersService.moveImageToFolder('img-1', 'fld-img');
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/images/img-1/folder', { folderId: 'fld-img' });
    expect(imgRes.folderId).toBe('fld-img');

    const tblRes = await foldersService.moveTableToFolder('tbl-1', 'fld-tbl');
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/tables/tbl-1/folder', { folderId: 'fld-tbl' });
    expect(tblRes.folderId).toBe('fld-tbl');
  });

  it('gestiona shares de carpeta (READ/EDIT, ai_manager y revocación)', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      share: {
        id: 'sh-ai',
        folderId: 'fld-1',
        userId: 'u-ai-manager',
        permission: 'READ',
        user: { id: 'u-ai-manager', username: 'ai_manager', role: 'COLLABORATOR' },
      },
    });
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      shares: [{ id: 'sh-ai', folderId: 'fld-1', userId: 'u-ai-manager', permission: 'READ' }],
    });
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      share: { id: 'sh-1', folderId: 'fld-1', userId: 'col-1', permission: 'EDIT' },
    });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ revoked: true });

    const created = await foldersService.shareFolder('fld-1', 'u-ai-manager', 'READ');
    expect(postSpy).toHaveBeenCalledWith('/api/v1/folders/fld-1/shares', {
      userId: 'u-ai-manager',
      permission: 'READ',
    });
    expect(created.user?.username).toBe('ai_manager');

    const shares = await foldersService.listShares('fld-1');
    expect(getSpy).toHaveBeenCalledWith('/api/v1/folders/fld-1/shares');
    expect(shares).toHaveLength(1);

    const updated = await foldersService.updateSharePermission('fld-1', 'col-1', 'EDIT');
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/folders/fld-1/shares/col-1', {
      permission: 'EDIT',
    });
    expect(updated.permission).toBe('EDIT');

    const revoked = await foldersService.revokeShare('fld-1', 'u-ai-manager');
    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/folders/fld-1/shares/u-ai-manager');
    expect(revoked.revoked).toBe(true);
  });
});
