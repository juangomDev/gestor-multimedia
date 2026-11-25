import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { bulkService } from '../services/bulkService';
import { queryKeys } from './queryKeys';

async function invalidateMany(
  queryClient: QueryClient,
  keys: ReadonlyArray<readonly unknown[]>
): Promise<void> {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

/** Mutación para eliminación en lote de hasta 50 imágenes (`POST /api/v1/images/bulk-delete`). */
export function useBulkDeleteImagesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkService.bulkDeleteImages(ids),
    onSuccess: () =>
      invalidateMany(qc, [queryKeys.images.all, queryKeys.folders.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para traslado en lote de hasta 50 imágenes (`POST /api/v1/images/bulk-move`). */
export function useBulkMoveImagesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, targetFolderId }: { ids: string[]; targetFolderId: string }) =>
      bulkService.bulkMoveImages(ids, targetFolderId),
    onSuccess: () => invalidateMany(qc, [queryKeys.images.all, queryKeys.folders.all]),
  });
}

/** Mutación para eliminación en lote de hasta 50 tablas (`POST /api/v1/tables/bulk-delete`). */
export function useBulkDeleteTablesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkService.bulkDeleteTables(ids),
    onSuccess: () =>
      invalidateMany(qc, [queryKeys.tables.all, queryKeys.folders.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para traslado en lote de hasta 50 tablas (`POST /api/v1/tables/bulk-move`). */
export function useBulkMoveTablesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, targetFolderId }: { ids: string[]; targetFolderId: string }) =>
      bulkService.bulkMoveTables(ids, targetFolderId),
    onSuccess: () => invalidateMany(qc, [queryKeys.tables.all, queryKeys.folders.all]),
  });
}

/** Mutación para eliminación en lote de hasta 50 PDFs (`POST /api/v1/pdfs/bulk-delete`). */
export function useBulkDeletePdfsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkService.bulkDeletePdfs(ids),
    onSuccess: () =>
      invalidateMany(qc, [queryKeys.pdfs.all, queryKeys.folders.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para traslado en lote de hasta 50 PDFs (`POST /api/v1/pdfs/bulk-move`). */
export function useBulkMovePdfsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, targetFolderId }: { ids: string[]; targetFolderId: string }) =>
      bulkService.bulkMovePdfs(ids, targetFolderId),
    onSuccess: () => invalidateMany(qc, [queryKeys.pdfs.all, queryKeys.folders.all]),
  });
}
