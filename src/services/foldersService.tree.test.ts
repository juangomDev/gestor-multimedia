import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  foldersService,
  flattenFolderTree,
  getFolderDepth,
  getFolderPathLabel,
} from './foldersService';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

describe('foldersService — Jerarquía 3 niveles (/tree), parentId y compartición ai_manager (v2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.resetCache();
  });

  it('consume GET /api/v1/folders/tree, normaliza shared (isSystem) y calcula profundidad/rutas', async () => {
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
    expect(tree).toHaveLength(2);
    expect(tree[0].isSystem).toBe(true);
    expect(tree[0].type).toBe('container');

    const flat = flattenFolderTree(tree);
    expect(flat).toHaveLength(4);

    const lvl3 = flat.find((f) => f.id === 'fld-l3')!;
    expect(getFolderDepth('fld-l1', flat)).toBe(1);
    expect(getFolderDepth('fld-l2', flat)).toBe(2);
    expect(getFolderDepth('fld-l3', flat)).toBe(3);
    expect(getFolderPathLabel(lvl3, flat)).toBe('Proyectos 2026 › Campañas › Banners Q4');
  });

  it('envía parentId en fetchFolders() y soporta CONTAINER + parentId en createFolder()', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ folders: [] });
    await foldersService.fetchFolders('TABLE', undefined, undefined, undefined, 'fld-l1');
    expect(getSpy).toHaveBeenCalledWith('/api/v1/folders?type=TABLE&parentId=fld-l1');

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      folder: {
        id: 'fld-sub-1',
        name: 'Finanzas',
        type: 'TABLE',
        parentId: 'fld-l1',
      },
    });

    const created = await foldersService.createFolder({
      name: 'Finanzas',
      type: 'table',
      parentId: 'fld-l1',
      isPrivate: false,
    });

    expect(postSpy).toHaveBeenCalledWith('/api/v1/folders', {
      name: 'Finanzas',
      type: 'TABLE',
      parentId: 'fld-l1',
      isPrivate: false,
    });
    expect(created.parentId).toBe('fld-l1');
    expect(created.type).toBe('table');
  });

  it('gestiona shares de carpeta incluyendo publicación en Widget Público (ai_manager READ)', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      share: {
        id: 'sh-ai',
        folderId: 'fld-tbl',
        userId: 'u-ai-manager',
        permission: 'READ',
        user: { id: 'u-ai-manager', username: 'ai_manager', role: 'COLLABORATOR' },
      },
    });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);

    const share = await foldersService.shareFolder('fld-tbl', 'u-ai-manager', 'READ');
    expect(postSpy).toHaveBeenCalledWith('/api/v1/folders/fld-tbl/shares', {
      userId: 'u-ai-manager',
      permission: 'READ',
    });
    expect(share.user?.username).toBe('ai_manager');

    await foldersService.revokeShare('fld-tbl', 'u-ai-manager');
    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/folders/fld-tbl/shares/u-ai-manager');
  });
});
