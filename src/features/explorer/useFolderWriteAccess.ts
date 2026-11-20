import { useContext, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/useAuth';
import { queryKeys } from '../../queries/queryKeys';
import { useFolderTreeQuery } from '../../queries/useFoldersQueries';
import { flattenFolderTree } from '../../services/foldersService';
import { ShellContext } from '../shell/shellContextDef';
import { canWriteFolder } from './explorerRules';
import type { FolderItem } from '../../types/media';

/**
 * Evalúa si el usuario actual posee permisos de escritura (`EDIT` o `ADMIN`) sobre una carpeta,
 * reutilizando el árbol de carpetas de `ShellContext` o de TanStack Query sin disparar peticiones
 * redundantes cuando el usuario es `ADMIN` o cuando el estado de ruta ya incluye `explicitCanEdit`.
 *
 * @param folderId UUID de la carpeta a verificar.
 * @param explicitCanEdit Permiso precalculado opcional recibido por `location.state`.
 * @returns `true` cuando el usuario tiene permiso para modificar activos o dictaminar en la carpeta.
 */
export function useFolderWriteAccess(
  folderId: string | null | undefined,
  explicitCanEdit?: boolean
): boolean {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const shell = useContext(ShellContext);

  const shellFolders = shell?.allFolders;
  const cachedTree = queryClient.getQueryData<FolderItem[]>(queryKeys.folders.tree());
  const needTreeFetch = Boolean(
    folderId &&
      explicitCanEdit === undefined &&
      user?.role !== 'ADMIN' &&
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

  if (explicitCanEdit !== undefined) return explicitCanEdit;
  if (targetFolder) return canWriteFolder(targetFolder, user?.role, user?.id);
  return user?.role === 'ADMIN' || (user?.role === 'MANAGER' && !folderId);
}
