import { useContext, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/useAuth';
import { queryKeys } from '../../queries/queryKeys';
import { useFolderTreeQuery } from '../../queries/useFoldersQueries';
import { flattenFolderTree } from '../../services/foldersService';
import { ShellContext } from '../shell/shellContextDef';
import { canManageFolderEntity } from './explorerRules';
import type { FolderItem } from '../../types/media';

/**
 * Evalúa si el usuario actual es propietario de la carpeta o `ADMIN`, condición exigida por
 * `monolith-backend` para operaciones destructivas reservadas al dueño (por ejemplo, eliminar
 * entradas individuales de formularios vía `DELETE /api/v1/forms/entries/:id`).
 *
 * A diferencia de `useFolderWriteAccess`, retorna siempre `false` para `COLLABORATOR`
 * (incluso con permiso `EDIT`) y para un `MANAGER` invitado en carpetas ajenas.
 *
 * @param folderId UUID de la carpeta propietaria del recurso.
 * @returns `true` únicamente si el usuario es `ADMIN` o propietario directo de la carpeta.
 */
export function useFolderOwnerAccess(folderId: string | null | undefined): boolean {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const shell = useContext(ShellContext);

  const shellFolders = shell?.allFolders;
  const cachedTree = queryClient.getQueryData<FolderItem[]>(queryKeys.folders.tree());
  const needTreeFetch = Boolean(
    folderId &&
      user?.role !== 'ADMIN' &&
      user?.role !== 'COLLABORATOR' &&
      !shellFolders?.length &&
      !cachedTree
  );
  const folderTreeQuery = useFolderTreeQuery(needTreeFetch);

  const targetFolder = useMemo(() => {
    if (!folderId) return null;
    const flat = shellFolders?.length
      ? shellFolders
      : flattenFolderTree(folderTreeQuery.data ?? cachedTree ?? []);
    return flat.find((f) => f.id === folderId) ?? null;
  }, [folderId, shellFolders, folderTreeQuery.data, cachedTree]);

  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'COLLABORATOR') return false;
  if (targetFolder) return canManageFolderEntity(targetFolder, user.role, user.id);
  return false;
}
