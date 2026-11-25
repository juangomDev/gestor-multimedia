import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { imagesService, type FetchImagesOptions } from '../services/imagesService';
import { tablesService, type FetchTablesOptions } from '../services/tablesService';
import { hasActiveTableQueryFilters } from '../services/tables/tableQueryUrl';
import { pdfsService, type FetchPdfsOptions } from '../services/pdfsService';
import { foldersService } from '../services/foldersService';
import type { MetadataCard, TableDataQueryOptions } from '../types/api';
import type { ImageMetadataCard, PdfMetadataCard } from '../types/media';
import { queryKeys } from './queryKeys';

/**
 * Invalida en paralelo un conjunto de claves de caché sin provocar waterfalls.
 */
async function invalidateMany(
  queryClient: QueryClient,
  keys: ReadonlyArray<readonly unknown[]>
): Promise<void> {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

/**
 * Consulta imágenes paginadas y filtradas por carpeta/búsqueda (`GET /api/v1/images`).
 */
export function useImagesQuery(options: FetchImagesOptions = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.images.list(options),
    queryFn: () => imagesService.listImages(options),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Consulta datasets tabulares paginados (`GET /api/v1/tables`).
 */
export function useTablesQuery(options: FetchTablesOptions = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.tables.list(options),
    queryFn: () => tablesService.listTables(options),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Consulta filas paginadas, filtradas dinámicamente (`?search=`, `?select=`, `?col=val`, `?father=null`)
 * y metadatos ricos de una tabla para Data Studio (`GET /t/:shortCode`).
 */
export function useTableDataQuery(
  shortCode: string | null | undefined,
  page: number = 1,
  limit: number = 50,
  filterOptions?: Omit<TableDataQueryOptions, 'page' | 'limit'>
) {
  const hasFilters = hasActiveTableQueryFilters(filterOptions);
  return useQuery({
    queryKey: queryKeys.tables.data(shortCode || '', page, limit, filterOptions),
    queryFn: () =>
      hasFilters
        ? tablesService.fetchTableDetails(shortCode!, page, limit, filterOptions)
        : tablesService.fetchTableDetails(shortCode!, page, limit),
    placeholderData: keepPreviousData,
    enabled: Boolean(shortCode),
  });
}

/**
 * Consulta documentos PDF paginados y filtrados por carpeta/búsqueda (`GET /api/v1/pdfs`).
 */
export function usePdfsQuery(options: FetchPdfsOptions = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.pdfs.list(options),
    queryFn: () => pdfsService.listPdfs(options),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Consulta el texto estructurado extraído por página de un PDF (`GET /p/:shortCode?format=text`).
 */
export function usePdfExtractedTextQuery(
  shortCode: string | null | undefined,
  page?: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.pdfs.extractedText(shortCode || '', page),
    queryFn: () => pdfsService.fetchPdfExtractedText(shortCode!, page),
    enabled: Boolean(shortCode) && enabled,
  });
}

/** Mutación para subir una imagen (`POST /api/v1/images`). */
export function useUploadImageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string | null }) =>
      imagesService.uploadImage(file, folderId),
    onSuccess: () => invalidateMany(qc, [queryKeys.images.all, queryKeys.folders.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para renombrar una imagen (`PATCH /api/v1/images/:id`). */
export function useRenameImageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, originalName }: { id: string; originalName: string }) =>
      imagesService.renameImage(id, originalName),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.images.all }),
  });
}

/** Mutación para reemplazar el binario de una imagen en caliente (`PUT /api/v1/images/:id`). */
export function useReplaceImageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => imagesService.replaceImage(id, file),
    onSuccess: () => invalidateMany(qc, [queryKeys.images.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para actualizar la ficha técnica de una imagen (`PATCH /api/v1/images/:id/metadata`). */
export function useUpdateImageMetadataMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, metadata }: { id: string; metadata: ImageMetadataCard }) =>
      imagesService.updateImageMetadata(id, metadata),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.images.all }),
  });
}

/** Mutación para eliminar una imagen (`DELETE /api/v1/images/:id`). */
export function useDeleteImageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => imagesService.deleteImage(id),
    onSuccess: () => invalidateMany(qc, [queryKeys.images.all, queryKeys.folders.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para mover una imagen a otra carpeta `IMAGE` (`PATCH /api/v1/images/:id/folder`). */
export function useMoveImageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ imageId, folderId }: { imageId: string; folderId: string }) =>
      foldersService.moveImageToFolder(imageId, folderId),
    onSuccess: () => invalidateMany(qc, [queryKeys.images.all, queryKeys.folders.all]),
  });
}

/** Mutación para subir una tabla `.csv`, `.xlsx`, `.xls` o `.json` (`POST /api/v1/tables`). */
export function useUploadTableMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string | null }) =>
      tablesService.uploadTable(file, folderId),
    onSuccess: () => invalidateMany(qc, [queryKeys.tables.all, queryKeys.folders.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para renombrar una tabla (`PATCH /api/v1/tables/:id`). */
export function useRenameTableMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tableName }: { id: string; tableName: string }) => tablesService.renameTable(id, tableName),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tables.all }),
  });
}

/** Mutación para reemplazo Hot-Swap de tabla `.csv/.xlsx/.xls/.json` (`PUT /api/v1/tables/:id`). */
export function useHotSwapTableMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => tablesService.hotSwapTable(id, file),
    onSuccess: () => invalidateMany(qc, [queryKeys.tables.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para actualizar la Ficha Técnica de una tabla (`PATCH /api/v1/tables/:id/metadata`). */
export function useUpdateTableMetadataMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, metadata }: { id: string; metadata: MetadataCard }) =>
      tablesService.updateTableMetadata(id, metadata),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tables.all }),
  });
}

/** Mutación para eliminar una tabla (`DELETE /api/v1/tables/:id`). */
export function useDeleteTableMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tablesService.deleteTable(id),
    onSuccess: () => invalidateMany(qc, [queryKeys.tables.all, queryKeys.folders.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para mover una tabla a otra carpeta `TABLE` (`PATCH /api/v1/tables/:id/folder`). */
export function useMoveTableMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, folderId }: { tableId: string; folderId: string }) =>
      foldersService.moveTableToFolder(tableId, folderId),
    onSuccess: () => invalidateMany(qc, [queryKeys.tables.all, queryKeys.folders.all]),
  });
}

/** Mutación para subir un PDF (`POST /api/v1/pdfs`). */
export function useUploadPdfMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string | null }) =>
      pdfsService.uploadPdf(file, folderId),
    onSuccess: () => invalidateMany(qc, [queryKeys.pdfs.all, queryKeys.folders.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para renombrar un PDF (`PATCH /api/v1/pdfs/:id`). */
export function useRenamePdfMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, originalName }: { id: string; originalName: string }) => pdfsService.renamePdf(id, originalName),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pdfs.all }),
  });
}

/** Mutación para reemplazo Hot-Swap de un PDF (`PUT /api/v1/pdfs/:id`). */
export function useHotSwapPdfMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => pdfsService.hotSwapPdf(id, file),
    onSuccess: () => invalidateMany(qc, [queryKeys.pdfs.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para actualizar metadatos semánticos de un PDF (`PATCH /api/v1/pdfs/:id/metadata`). */
export function useUpdatePdfMetadataMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, metadata }: { id: string; metadata: PdfMetadataCard }) =>
      pdfsService.updatePdfMetadata(id, metadata),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pdfs.all }),
  });
}

/** Mutación para eliminar un PDF (`DELETE /api/v1/pdfs/:id`). */
export function useDeletePdfMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pdfsService.deletePdf(id),
    onSuccess: () => invalidateMany(qc, [queryKeys.pdfs.all, queryKeys.folders.all, queryKeys.storageStats.all]),
  });
}

/** Mutación para mover un PDF a otra carpeta `PDF` (`PATCH /api/v1/pdfs/:id/folder`). */
export function useMovePdfMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetFolderId }: { id: string; targetFolderId: string }) =>
      pdfsService.movePdfToFolder(id, targetFolderId),
    onSuccess: () => invalidateMany(qc, [queryKeys.pdfs.all, queryKeys.folders.all]),
  });
}

export {
  useBulkDeleteImagesMutation,
  useBulkMoveImagesMutation,
  useBulkDeleteTablesMutation,
  useBulkMoveTablesMutation,
  useBulkDeletePdfsMutation,
  useBulkMovePdfsMutation,
} from './useBulkMediaMutations';
