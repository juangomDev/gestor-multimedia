import { useMemo } from 'react';
import { useFolderTreeQuery } from '../../queries/useFoldersQueries';
import {
  useDeleteImageMutation,
  useDeletePdfMutation,
  useDeleteTableMutation,
  useImagesQuery,
  useMoveImageMutation,
  useMovePdfMutation,
  useMoveTableMutation,
  usePdfsQuery,
  useTablesQuery,
} from '../../queries/useMediaQueries';
import { useFormsListQuery } from '../../queries/useFormsQueries';
import { flattenFolderTree } from '../../services/foldersService';
import { getBreadcrumbTrail } from './explorerRules';
import type { FolderItem } from '../../types/media';
import type { ExplorerAsset } from './AssetItemCard';

/**
 * Resultado consolidado del contenido visible en `/` o `/folder/:folderId`.
 */
export interface ExplorerFolderContentResult {
  allFolders: FolderItem[];
  activeFolder: FolderItem | null;
  breadcrumbs: FolderItem[];
  visibleFolders: FolderItem[];
  visibleAssets: ExplorerAsset[];
  selectableAssetIds: string[];
  isLoadingFolders: boolean;
  isLoadingAssets: boolean;
  isError: boolean;
  isFolderNotFound: boolean;
  refetchAll: () => void;
  moveAsset: (asset: ExplorerAsset, targetFolderId: string) => Promise<void>;
  deleteAsset: (asset: ExplorerAsset) => Promise<void>;
  isMutatingAsset: boolean;
}

/**
 * Orquesta las consultas React Query del Explorador Unificado sin waterfalls:
 * - En raíz (`/`) solo consulta `folders/tree` (cero peticiones a archivos sueltos).
 * - Dentro de `/folder/:folderId` dispara únicamente las consultas del tipo exacto de carpeta
 *   (en `TABLE` carga tablas y formularios en paralelo).
 */
export function useExplorerFolderContent(
  folderId: string | undefined,
  deferredSearch: string
): ExplorerFolderContentResult {
  const folderTreeQuery = useFolderTreeQuery();

  const allFolders = useMemo(
    () => flattenFolderTree(folderTreeQuery.data ?? []),
    [folderTreeQuery.data]
  );

  const activeFolder = useMemo(
    () => (folderId ? allFolders.find((f) => f.id === folderId) ?? null : null),
    [allFolders, folderId]
  );

  const breadcrumbs = useMemo(
    () => getBreadcrumbTrail(folderId, allFolders),
    [folderId, allFolders]
  );

  const isImageFolder = Boolean(folderId && activeFolder?.type === 'image');
  const isTableFolder = Boolean(folderId && activeFolder?.type === 'table');
  const isPdfFolder = Boolean(folderId && activeFolder?.type === 'pdf');

  const imagesQuery = useImagesQuery({ folderId, limit: 100 }, isImageFolder);
  const tablesQuery = useTablesQuery({ folderId, limit: 100 }, isTableFolder);
  const formsQuery = useFormsListQuery({ folderId }, isTableFolder);
  const pdfsQuery = usePdfsQuery({ folderId, limit: 100 }, isPdfFolder);

  const moveImage = useMoveImageMutation();
  const moveTable = useMoveTableMutation();
  const movePdf = useMovePdfMutation();
  const deleteImage = useDeleteImageMutation();
  const deleteTable = useDeleteTableMutation();
  const deletePdf = useDeletePdfMutation();

  const needle = deferredSearch.trim().toLowerCase();

  const visibleFolders = useMemo(() => {
    const levelFolders = allFolders.filter((f) => (f.parentId ?? null) === (folderId ?? null));
    if (!needle) return levelFolders;
    return levelFolders.filter((f) => f.name.toLowerCase().includes(needle));
  }, [allFolders, folderId, needle]);

  const visibleAssets = useMemo<ExplorerAsset[]>(() => {
    if (!folderId || !activeFolder || activeFolder.type === 'container') return [];

    if (activeFolder.type === 'image') {
      const items = imagesQuery.data?.items ?? [];
      return items
        .filter((img) =>
          needle
            ? img.originalName.toLowerCase().includes(needle) ||
              img.shortCode.toLowerCase().includes(needle)
            : true
        )
        .map((item) => ({ kind: 'image' as const, item }));
    }

    if (activeFolder.type === 'table') {
      const tables = (tablesQuery.data?.items ?? [])
        .filter((tbl) =>
          needle
            ? tbl.tableName.toLowerCase().includes(needle) ||
              tbl.shortCode.toLowerCase().includes(needle)
            : true
        )
        .map((item) => ({ kind: 'table' as const, item }));

      const forms = (formsQuery.data ?? [])
        .filter((frm) => frm.folderId === folderId)
        .filter((frm) =>
          needle
            ? frm.title.toLowerCase().includes(needle) || frm.slug.toLowerCase().includes(needle)
            : true
        )
        .map((item) => ({ kind: 'form' as const, item }));

      return [...tables, ...forms];
    }

    const pdfs = pdfsQuery.data?.items ?? [];
    return pdfs
      .filter((pdf) =>
        needle
          ? pdf.originalName.toLowerCase().includes(needle) ||
            pdf.shortCode.toLowerCase().includes(needle)
          : true
      )
      .map((item) => ({ kind: 'pdf' as const, item }));
  }, [
    folderId,
    activeFolder,
    imagesQuery.data,
    tablesQuery.data,
    formsQuery.data,
    pdfsQuery.data,
    needle,
  ]);

  const selectableAssetIds = useMemo(
    () =>
      visibleAssets
        .filter((a) => a.kind === 'image' || a.kind === 'table')
        .map((a) => a.item.id),
    [visibleAssets]
  );

  const moveAsset = async (asset: ExplorerAsset, targetFolderId: string): Promise<void> => {
    if (asset.kind === 'image') {
      await moveImage.mutateAsync({ imageId: asset.item.id, folderId: targetFolderId });
    } else if (asset.kind === 'table') {
      await moveTable.mutateAsync({ tableId: asset.item.id, folderId: targetFolderId });
    } else if (asset.kind === 'pdf') {
      await movePdf.mutateAsync({ id: asset.item.id, targetFolderId });
    }
  };

  const deleteAsset = async (asset: ExplorerAsset): Promise<void> => {
    if (asset.kind === 'image') {
      await deleteImage.mutateAsync(asset.item.id);
    } else if (asset.kind === 'table') {
      await deleteTable.mutateAsync(asset.item.id);
    } else if (asset.kind === 'pdf') {
      await deletePdf.mutateAsync(asset.item.id);
    }
  };

  const isLoadingAssets =
    (isImageFolder && imagesQuery.isLoading) ||
    (isTableFolder && (tablesQuery.isLoading || formsQuery.isLoading)) ||
    (isPdfFolder && pdfsQuery.isLoading);

  const isError =
    folderTreeQuery.isError ||
    (isImageFolder && imagesQuery.isError) ||
    (isTableFolder && (tablesQuery.isError || formsQuery.isError)) ||
    (isPdfFolder && pdfsQuery.isError);

  const isFolderNotFound = Boolean(
    folderId && !folderTreeQuery.isLoading && !folderTreeQuery.isError && !activeFolder
  );

  const refetchAll = () => {
    void folderTreeQuery.refetch();
    if (isImageFolder) void imagesQuery.refetch();
    if (isTableFolder) {
      void tablesQuery.refetch();
      void formsQuery.refetch();
    }
    if (isPdfFolder) void pdfsQuery.refetch();
  };

  const isMutatingAsset =
    moveImage.isPending ||
    moveTable.isPending ||
    movePdf.isPending ||
    deleteImage.isPending ||
    deleteTable.isPending ||
    deletePdf.isPending;

  return {
    allFolders,
    activeFolder,
    breadcrumbs,
    visibleFolders,
    visibleAssets,
    selectableAssetIds,
    isLoadingFolders: folderTreeQuery.isLoading,
    isLoadingAssets,
    isError,
    isFolderNotFound,
    refetchAll,
    moveAsset,
    deleteAsset,
    isMutatingAsset,
  };
}
