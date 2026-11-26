import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  usersService,
  type FetchUsersOptions,
  type PaginatedUsersResponse,
} from '../services/usersService';
import { auditService, type FetchAuditLogsOptions } from '../services/auditService';
import {
  apiKeysService,
  type ApiKeyItem,
  type CreateApiKeyInput,
  type UpdateApiKeyInput,
} from '../services/apiKeysService';
import { storageStatsService } from '../services/storageStatsService';
import { healthService } from '../services/healthService';
import type { CreateUserInput, User } from '../types/auth';
import { queryKeys } from './queryKeys';

/**
 * Lista los usuarios visibles según el rol actual (`GET /api/v1/users`).
 */
export function useUsersQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: () => usersService.listUsers(),
    enabled,
  });
}

/**
 * Lista usuarios con filtrado (`search`, `role`, `isActive`) y paginación server-side
 * (`GET /api/v1/users`).
 */
export function useUsersPaginatedQuery(
  options: FetchUsersOptions = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.users.paginated(options),
    queryFn: () => usersService.listUsersPaginated(options),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Consulta registros de auditoría filtrables y paginados (`GET /api/v1/audit-logs`).
 */
export function useAuditLogsQuery(
  options: FetchAuditLogsOptions = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(options),
    queryFn: () => auditService.fetchAuditLogs(options),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Lista las claves de integración API Keys (`GET /api/v1/api-keys`, exclusivo `ADMIN`).
 */
export function useApiKeysQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.apiKeys.list(),
    queryFn: () => apiKeysService.listApiKeys(),
    enabled,
  });
}

/**
 * Consulta las métricas de almacenamiento BD, disco físico y top carpetas (`GET /api/v1/stats/storage`).
 */
export function useStorageStatsQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.storageStats.summary(),
    queryFn: () => storageStatsService.fetchStorageStats(),
    enabled,
  });
}

/**
 * Consulta el estado de salud y latencia del backend (`GET /health`).
 */
export function useHealthQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.health.status(),
    queryFn: () => healthService.checkHealth(),
    staleTime: 15_000,
    enabled,
  });
}

/**
 * Mutación para crear un colaborador o gestor (`POST /api/v1/users`).
 */
export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserInput) => usersService.createUser(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * Mutación optimista para activar o suspender una cuenta (`PATCH /api/v1/users/:id/status`).
 */
export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      usersService.updateUserStatus(userId, isActive),
    onMutate: async ({ userId, isActive }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });
      const previous = queryClient.getQueryData<User[]>(queryKeys.users.list());
      const previousPaginated = queryClient.getQueriesData<PaginatedUsersResponse>({
        queryKey: ['users', 'paginated'],
      });
      if (previous) {
        queryClient.setQueryData<User[]>(
          queryKeys.users.list(),
          previous.map((u) => (u.id === userId ? { ...u, isActive } : u))
        );
      }
      previousPaginated.forEach(([key, pageData]) => {
        if (!pageData) return;
        queryClient.setQueryData<PaginatedUsersResponse>(key, {
          ...pageData,
          users: pageData.users.map((u) => (u.id === userId ? { ...u, isActive } : u)),
        });
      });
      return { previous, previousPaginated };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.users.list(), context.previous);
      }
      context?.previousPaginated.forEach(([key, pageData]) => {
        queryClient.setQueryData(key, pageData);
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * Mutación para restablecer la contraseña de un subordinado (`PATCH /api/v1/users/:id/password`).
 */
export function useResetUserPasswordMutation() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      usersService.resetUserPassword(userId, newPassword),
  });
}

/**
 * Mutación para eliminar un usuario en cascada (`DELETE /api/v1/users/:id`).
 */
export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersService.deleteUser(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.images.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tables.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pdfs.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.forms.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.storageStats.all }),
      ]);
    },
  });
}

/**
 * Mutación para emitir una nueva API Key (`POST /api/v1/api-keys`).
 */
export function useCreateApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateApiKeyInput) => apiKeysService.createApiKey(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

/**
 * Mutación optimista para actualizar nombre, descripción, cuota o estado activo de una API Key
 * sin revocar su secreto (`PATCH /api/v1/api-keys/:id`).
 */
export function useUpdateApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateApiKeyInput }) =>
      apiKeysService.updateApiKey(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.apiKeys.all });
      const previous = queryClient.getQueryData<ApiKeyItem[]>(queryKeys.apiKeys.list());
      if (previous) {
        queryClient.setQueryData<ApiKeyItem[]>(
          queryKeys.apiKeys.list(),
          previous.map((item) => (item.id === id ? { ...item, ...payload } : item))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.apiKeys.list(), context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

/**
 * Mutación para revocar una API Key (`DELETE /api/v1/api-keys/:id`).
 */
export function useDeleteApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiKeysService.deleteApiKey(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}
