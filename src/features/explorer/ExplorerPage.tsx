import React, { useDeferredValue, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { storageService, type ExplorerViewMode } from '../../services/storageService';
import { useShell } from '../shell/useShell';
import { resolveContextualUploadState } from '../shell/uploadContextRules';
import {
  canCreateChildFolder,
  canManageFolderEntity,
  canManageFolderShares,
  canWriteFolder,
  getUploadConstraints,
} from './explorerRules';
import { useExplorerFolderContent } from './useExplorerFolderContent';
import { useBulkSelection } from './useBulkSelection';
import { useExplorerDragDrop } from './useExplorerDragDrop';
import { ExplorerHeader } from './ExplorerHeader';
import type { ExplorerAsset } from './AssetItemCard';
import { ExplorerGridSections } from './ExplorerGridSections';
import { ExplorerListTable } from './ExplorerListTable';
import { ExplorerContainerBanner, ExplorerEmptyState } from './ExplorerStatusStates';
import { DropzoneOverlay } from './DropzoneOverlay';
import { BulkActionBar } from './BulkActionBar';
import { ExplorerModals, type ExplorerAssetModalState } from './ExplorerModals';
import type { FolderItem } from '../../types/media';
import styles from './ExplorerPage.module.css';

type FolderModalState = { type: 'edit' | 'delete' | 'share'; folder: FolderItem } | null;

/**
 * Explorador Unificado por Carpetas (`/` y `/folder/:folderId`) — "Archivo Editorial".
 * En raíz `/` muestra exclusivamente carpetas de Nivel 1 (cero archivos sueltos y cero subidas sin carpeta).
 * Dentro de carpetas tipadas muestra subcarpetas + archivos, Drag & Drop contextual, formularios y Bulk Actions.
 */
export const ExplorerPage: React.FC = () => {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { openCommandPalette, openShortCodePreview, registerUploadHandler } = useShell();

  const [trackedFolderId, setTrackedFolderId] = useState(folderId);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [viewMode, setViewMode] = useState<ExplorerViewMode>(() => storageService.getViewMode());

  const [createOpen, setCreateOpen] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [folderModal, setFolderModal] = useState<FolderModalState>(null);
  const [assetModal, setAssetModal] = useState<ExplorerAssetModalState | null>(null);
  const [uploadModal, setUploadModal] = useState<{ open: boolean; files?: File[] }>({ open: false });

  if (trackedFolderId !== folderId) {
    setTrackedFolderId(folderId);
    setSearchQuery('');
  }

  const content = useExplorerFolderContent(folderId, deferredSearch);
  const bulk = useBulkSelection();
  const clearBulk = bulk.clear;

  useEffect(() => {
    clearBulk();
  }, [folderId, clearBulk]);

  const uploadGuard = resolveContextualUploadState(content.activeFolder, user?.role, user?.id);
  const createFolderGuard = canCreateChildFolder(
    content.activeFolder,
    content.allFolders,
    user?.role,
    user?.id
  );
  const canEditCurrentFolder = canWriteFolder(content.activeFolder, user?.role, user?.id);
  const canCreateForm = Boolean(
    folderId && content.activeFolder?.type === 'table' && canEditCurrentFolder
  );
  const supportsBulk = Boolean(
    folderId &&
      canEditCurrentFolder &&
      content.activeFolder &&
      content.activeFolder.type !== 'container'
  );

  useEffect(() => {
    if (!uploadGuard.enabled || !content.activeFolder) return;
    return registerUploadHandler(() => setUploadModal({ open: true }));
  }, [uploadGuard.enabled, content.activeFolder, registerUploadHandler]);

  const { isDragging, dragHandlers } = useExplorerDragDrop({
    canUpload: Boolean(uploadGuard.enabled && content.activeFolder),
    blockedMessage: uploadGuard.disabledTooltip,
    onFilesAccepted: (files) => setUploadModal({ open: true, files }),
    onBlockedDrop: (reason) => showToast(reason, 'warning'),
  });

  const handleViewModeChange = (nextMode: ExplorerViewMode) => {
    setViewMode(nextMode);
    storageService.setViewMode(nextMode);
  };

  const handleOpenAsset = (asset: ExplorerAsset) => {
    if (asset.kind === 'image') {
      openShortCodePreview({
        type: 'image',
        shortCode: asset.item.shortCode,
        image: asset.item,
        canEdit: canEditCurrentFolder,
      });
    } else if (asset.kind === 'pdf') {
      openShortCodePreview({
        type: 'pdf',
        shortCode: asset.item.shortCode,
        pdf: asset.item,
        canEdit: canEditCurrentFolder,
      });
    } else if (asset.kind === 'table') {
      navigate(`/tables/${encodeURIComponent(asset.item.shortCode)}`, {
        state: {
          folderId,
          folderName: content.activeFolder?.name,
          tableId: asset.item.id,
          canEdit: canEditCurrentFolder,
        },
      });
    } else if (folderId) {
      navigate(`/folder/${folderId}/forms/${asset.item.id}`);
    }
  };

  const handleConfirmDeleteAsset = async (asset: ExplorerAsset) => {
    try {
      await content.deleteAsset(asset);
      showToast('Archivo eliminado correctamente', 'info');
      setAssetModal(null);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      showToast(detail || message || 'No se pudo eliminar el archivo.', 'error');
    }
  };

  const uploadConstraints =
    content.activeFolder && content.activeFolder.type !== 'container'
      ? getUploadConstraints(content.activeFolder.type)
      : null;

  const isEmptyAll =
    !content.isLoadingFolders &&
    !content.isLoadingAssets &&
    (content.isError ||
      content.isFolderNotFound ||
      (content.visibleFolders.length === 0 && content.visibleAssets.length === 0));

  const sharedListProps = {
    folders: content.visibleFolders,
    assets: content.visibleAssets,
    canEditFolder: (f: FolderItem) => canManageFolderEntity(f, user?.role, user?.id),
    canShareFolder: (f: FolderItem) => canManageFolderShares(f, user?.role, user?.id),
    canEditAssets: canEditCurrentFolder,
    isAssetSelected: bulk.isSelected,
    onToggleAssetSelect: bulk.toggle,
    onShareFolder: (folder: FolderItem) => setFolderModal({ type: 'share', folder }),
    onEditFolder: (folder: FolderItem) => setFolderModal({ type: 'edit', folder }),
    onDeleteFolder: (folder: FolderItem) => setFolderModal({ type: 'delete', folder }),
    onOpenAsset: handleOpenAsset,
    onRenameAsset: (asset: ExplorerAsset) => setAssetModal({ type: 'rename', asset }),
    onHotSwapAsset: (asset: ExplorerAsset) => setAssetModal({ type: 'hotswap', asset }),
    onEditAssetMetadata: (asset: ExplorerAsset) => setAssetModal({ type: 'metadata', asset }),
    onEditFormAsset: (asset: ExplorerAsset) => setAssetModal({ type: 'editForm', asset }),
    onMoveAsset: (asset: ExplorerAsset) => setAssetModal({ type: 'move', asset }),
    onDeleteAsset: (asset: ExplorerAsset) => setAssetModal({ type: 'delete', asset }),
  };

  return (
    <div className={styles.page} data-testid="explorer-page" {...dragHandlers}>
      <ExplorerHeader
        breadcrumbs={content.breadcrumbs}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        createFolderGuard={createFolderGuard}
        onOpenCreateFolder={() => setCreateOpen(true)}
        canCreateForm={canCreateForm}
        onOpenCreateForm={() => setCreateFormOpen(true)}
        onOpenCommandPalette={openCommandPalette}
      />

      {content.activeFolder?.type === 'container' ? (
        <ExplorerContainerBanner folder={content.activeFolder} />
      ) : null}

      {content.isLoadingFolders || content.isLoadingAssets ? (
        <div className={styles.folderGrid}>
          <Skeleton variant="card" height={96} />
          <Skeleton variant="card" height={96} />
          <Skeleton variant="card" height={96} />
          <Skeleton variant="card" height={96} />
        </div>
      ) : isEmptyAll ? (
        <ExplorerEmptyState
          isInsideFolder={Boolean(folderId)}
          isFolderNotFound={content.isFolderNotFound}
          isError={content.isError}
          searchQuery={deferredSearch}
          uploadGuard={uploadGuard}
          createFolderGuard={createFolderGuard}
          onOpenUpload={() => setUploadModal({ open: true })}
          onOpenCreateFolder={() => setCreateOpen(true)}
          onRetry={content.refetchAll}
          onReturnHome={() => navigate('/', { replace: true })}
        />
      ) : viewMode === 'list' ? (
        <ExplorerListTable {...sharedListProps} selectableAssets={supportsBulk} />
      ) : (
        <ExplorerGridSections
          {...sharedListProps}
          isInsideFolder={Boolean(folderId)}
          activeFolderType={content.activeFolder?.type}
          supportsBulk={supportsBulk}
          selectedCount={bulk.selectedCount}
        />
      )}

      {supportsBulk && folderId && content.activeFolder && content.activeFolder.type !== 'container' ? (
        <BulkActionBar
          resourceKind={content.activeFolder.type}
          selectedIds={bulk.selectedIds}
          totalSelectableCount={content.selectableAssetIds.length}
          allSelectableIds={content.selectableAssetIds}
          currentFolderId={folderId}
          allFolders={content.allFolders}
          onSelectAll={bulk.selectMany}
          onClear={bulk.clear}
        />
      ) : null}

      <DropzoneOverlay
        visible={isDragging}
        canUpload={uploadGuard.enabled}
        folderName={content.activeFolder?.name}
        formatsLabel={uploadConstraints?.formatsLabel}
        blockedReason={uploadGuard.disabledTooltip ?? undefined}
      />

      <ExplorerModals
        folderId={folderId}
        activeFolder={content.activeFolder}
        allFolders={content.allFolders}
        uploadEnabled={uploadGuard.enabled}
        canCreateForm={canCreateForm}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        createFormOpen={createFormOpen}
        onCreateFormOpenChange={setCreateFormOpen}
        editingFolder={folderModal?.type === 'edit' ? folderModal.folder : null}
        onCloseEditFolder={() => setFolderModal(null)}
        deletingFolder={folderModal?.type === 'delete' ? folderModal.folder : null}
        onCloseDeleteFolder={() => setFolderModal(null)}
        onFolderDeleted={(deletedId) => {
          if (deletedId === folderId) navigate('/', { replace: true });
        }}
        sharingFolder={folderModal?.type === 'share' ? folderModal.folder : null}
        onCloseShareFolder={() => setFolderModal(null)}
        assetModal={assetModal}
        onCloseAssetModal={() => setAssetModal(null)}
        onConfirmMoveAsset={async (asset, targetFolderId) => {
          await content.moveAsset(asset, targetFolderId);
          showToast('Archivo movido correctamente', 'success');
        }}
        onConfirmDeleteAsset={handleConfirmDeleteAsset}
        isMutatingAsset={content.isMutatingAsset}
        uploadModal={uploadModal}
        onCloseUploadModal={() => setUploadModal({ open: false })}
      />
    </div>
  );
};

export default ExplorerPage;
