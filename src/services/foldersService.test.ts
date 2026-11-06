import { describe, it, expect, vi, beforeEach } from 'vitest';
import { foldersService } from './foldersService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('FoldersService (PostgreSQL RBAC Folders & Sharing)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('fetchFolders() calls GET /api/v1/folders with optional filters and normalizes folders', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      folders: [
        {
          id: 'fld-1',
          name: 'General',
          type: 'IMAGE',
          color: '#3b82f6',
          isPrivate: false,
          itemCount: 8,
          userId: 'admin-1',
          myPermission: 'ADMIN',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'fld-2',
          name: 'Finanzas 2026',
          type: 'TABLE',
          color: '#10b981',
          isPrivate: true,
          itemCount: 3,
          userId: 'mgr-1',
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
    expect(folders[1].type).toBe('table');
    expect(folders[1].isPrivate).toBe(true);
    expect(storageService.getFolders()).toHaveLength(2);

    await foldersService.fetchFolders('IMAGE', 'General', 1, 20);
    expect(getSpy).toHaveBeenCalledWith(
      '/api/v1/folders?type=IMAGE&search=General&page=1&limit=20'
    );
  });

  it('getFolderById() calls GET /api/v1/folders/:id', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      folder: {
        id: 'fld-10',
        name: 'Campaña Verano',
        type: 'IMAGE',
        color: '#ec4899',
        isPrivate: true,
        itemCount: 15,
        userId: 'admin-1',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    });

    const folder = await foldersService.getFolderById('fld-10');
    expect(getSpy).toHaveBeenCalledWith('/api/v1/folders/fld-10');
    expect(folder.name).toBe('Campaña Verano');
    expect(folder.itemCount).toBe(15);
  });

  it('createFolder() calls POST /api/v1/folders and stores created folder', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      folder: {
        id: 'fld-new',
        name: 'Logos Corporativos',
        type: 'IMAGE',
        color: '#8b5cf6',
        isPrivate: true,
        itemCount: 0,
        userId: 'admin-1',
        createdAt: '2026-02-10T00:00:00.000Z',
      },
    });

    const created = await foldersService.createFolder({
      name: 'Logos Corporativos',
      type: 'image',
      color: '#8b5cf6',
      isPrivate: true,
    });

    expect(postSpy).toHaveBeenCalledWith('/api/v1/folders', {
      name: 'Logos Corporativos',
      type: 'IMAGE',
      color: '#8b5cf6',
      isPrivate: true,
    });
    expect(created.id).toBe('fld-new');
    expect(storageService.getFolders()).toHaveLength(1);
  });

  it('updateFolder() calls PATCH /api/v1/folders/:id and updates cached folder', async () => {
    storageService.saveFolders([
      {
        id: 'fld-edit',
        name: 'Antiguo Nombre',
        type: 'image',
        color: '#3b82f6',
        isPrivate: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      folder: {
        id: 'fld-edit',
        name: 'Nuevo Nombre',
        type: 'IMAGE',
        color: '#10b981',
        isPrivate: true,
        itemCount: 4,
        userId: 'admin-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });

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
    expect(storageService.getFolders()[0]?.name).toBe('Nuevo Nombre');
  });

  it('deleteFolder() calls DELETE /api/v1/folders/:id and removes from cache', async () => {
    storageService.saveFolders([
      {
        id: 'fld-del',
        name: 'Temporal',
        type: 'table',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const delSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({
      message: 'Eliminada',
      deletedCount: 2,
    });

    const res = await foldersService.deleteFolder('fld-del');
    expect(delSpy).toHaveBeenCalledWith('/api/v1/folders/fld-del');
    expect(res.deletedCount).toBe(2);
    expect(storageService.getFolders()).toHaveLength(0);
  });

  it('moveImageToFolder() and moveTableToFolder() call PATCH endpoints', async () => {
    const patchSpy = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValueOnce({ image: { id: 'img-1', folderId: 'fld-img' } })
      .mockResolvedValueOnce({ table: { id: 'tbl-1', folderId: 'fld-tbl' } });

    const imgRes = await foldersService.moveImageToFolder('img-1', 'fld-img');
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/images/img-1/folder', {
      folderId: 'fld-img',
    });
    expect(imgRes.folderId).toBe('fld-img');

    const tblRes = await foldersService.moveTableToFolder('tbl-1', 'fld-tbl');
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/tables/tbl-1/folder', {
      folderId: 'fld-tbl',
    });
    expect(tblRes.folderId).toBe('fld-tbl');
  });

  it('handles folder sharing lifecycle: shareFolder, listShares, updateSharePermission, revokeShare', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      share: { id: 'sh-1', folderId: 'fld-1', userId: 'col-1', permission: 'READ' },
    });
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      shares: [
        {
          id: 'sh-1',
          folderId: 'fld-1',
          userId: 'col-1',
          permission: 'READ',
          user: { id: 'col-1', username: 'colab_uno', role: 'COLLABORATOR' },
        },
      ],
    });
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      share: { id: 'sh-1', folderId: 'fld-1', userId: 'col-1', permission: 'EDIT' },
    });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ revoked: true });

    const created = await foldersService.shareFolder('fld-1', 'col-1', 'READ');
    expect(postSpy).toHaveBeenCalledWith('/api/v1/folders/fld-1/shares', {
      userId: 'col-1',
      permission: 'READ',
    });
    expect(created.permission).toBe('READ');

    const shares = await foldersService.listShares('fld-1');
    expect(getSpy).toHaveBeenCalledWith('/api/v1/folders/fld-1/shares');
    expect(shares).toHaveLength(1);

    const updated = await foldersService.updateSharePermission('fld-1', 'col-1', 'EDIT');
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/folders/fld-1/shares/col-1', {
      permission: 'EDIT',
    });
    expect(updated.permission).toBe('EDIT');

    const revoked = await foldersService.revokeShare('fld-1', 'col-1');
    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/folders/fld-1/shares/col-1');
    expect(revoked.revoked).toBe(true);
  });
});

