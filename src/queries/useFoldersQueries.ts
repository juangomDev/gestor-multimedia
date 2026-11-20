import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  foldersService,
  type CreateFolderPayload,
} from '../services/foldersService';
import type { ApiUpdateFolderInput } from '../types/api';
import { queryKeys } from './queryKeys';

/**
 * Consulta el árbol jerárquico completo de carpetas en hasta 3 niveles (`GET /api/v1/folders/tree`).
 *
 * @param enabled Controla si la consulta debe ejecutarse automáticamente.
 */
export function useFolderTreeQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.folders.tree(),
    queryFn: () => foldersService.fetchFolderTree(),
    enabled,
  });
}

/**
 * Lista las membresías y permisos compartidos sobre una carpeta (`GET /api/v1/folders/:id/shares`).
 *
 * @param folderId UUID de la carpeta.
 * @param enabled Controla si la consulta debe ejecutarse.
 */
export function useFolderSharesQuery(
  folderId: string | null | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.folders.shares(folderId || ''),
    queryFn: () => foldersService.listShares(folderId!),
    enabled: Boolean(folderId) && enabled,
  });
}

/**
 * Mutación para crear una nueva carpeta (`POST /api/v1/folders`) invalidando árbol y listados.
 */
export function useCreateFolderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFolderPayload) => foldersService.createFolder(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.storageStats.all }),
      ]);
    },
  });
}

/**
 * Mutación para actualizar nombre, color o privacidad de una carpeta (`PATCH /api/v1/folders/:id`).
 */
export function useUpdateFolderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApiUpdateFolderInput }) =>
      foldersService.updateFolder(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.folders.all });
    },
  });
}

/**
 * Mutación para eliminar una carpeta en cascada (`DELETE /api/v1/folders/:id`).
 * Invalida en paralelo carpetas, activos multimedia y cuotas de almacenamiento.
 */
export function useDeleteFolderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => foldersService.deleteFolder(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.images.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tables.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pdfs.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.forms.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.storageStats.all }),
      ]);
    },
  });
}

/**
 * Mutación para compartir una carpeta con un colaborador o `ai_manager` (`POST /api/v1/folders/:id/shares`).
 */
export function useShareFolderMutation(folderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      permission = 'READ',
    }: {
      userId: string;
      permission?: 'READ' | 'EDIT';
    }) => foldersService.shareFolder(folderId, userId, permission),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.shares(folderId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.tree() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.all }),
      ]);
    },
  });
}

/**
 * Mutación para alternar permiso `READ <-> EDIT` en una membresía (`PATCH /api/v1/folders/:id/shares/:userId`).
 */
export function useUpdateSharePermissionMutation(folderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, permission }: { userId: string; permission: 'READ' | 'EDIT' }) =>
      foldersService.updateSharePermission(folderId, userId, permission),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.folders.shares(folderId) });
    },
  });
}

/**
 * Mutación para revocar acceso compartido de un usuario (`DELETE /api/v1/folders/:id/shares/:userId`).
 */
export function useRevokeShareMutation(folderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => foldersService.revokeShare(folderId, userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.shares(folderId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.tree() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.all }),
      ]);
    },
  });
}
