import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { CreateFolderDialog } from './CreateFolderDialog';
import { EditFolderDialog } from './EditFolderDialog';
import { DeleteFolderDialog } from './DeleteFolderDialog';
import { ShareFolderDialog } from './ShareFolderDialog';
import { MoveResourceDialog } from './MoveResourceDialog';
import { UploadDialog } from './UploadDialog';
import { RenameAssetDialog } from '../images/RenameAssetDialog';
import { HotSwapAssetDialog } from '../images/HotSwapAssetDialog';
import { ImageMetadataDialog } from '../images/ImageMetadataDialog';
import { TableMetadataDialog } from '../data-studio/TableMetadataDialog';
import { PdfMetadataDialog } from '../pdfs/PdfMetadataDialog';
import { CreateFormDialog } from '../forms/CreateFormDialog';
import { EditFormDialog } from '../forms/EditFormDialog';
import { DeleteFormDialog } from '../forms/DeleteFormDialog';
import type { FolderItem } from '../../types/media';
import type { ExplorerAsset } from './AssetItemCard';
import styles from './ExplorerPage.module.css';

/**
 * Acción modal activa sobre un activo del Explorador.
 */
export interface ExplorerAssetModalState {
  type: 'move' | 'delete' | 'rename' | 'hotswap' | 'metadata' | 'editForm';
  asset: ExplorerAsset;
}

/**
 * Propiedades del coordinador de diálogos del Explorador (`ExplorerModals`).
 */
export interface ExplorerModalsProps {
  folderId: string | undefined;
  activeFolder: FolderItem | null;
  allFolders: FolderItem[];
  uploadEnabled: boolean;
  canCreateForm: boolean;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  createFormOpen: boolean;
  onCreateFormOpenChange: (open: boolean) => void;
  editingFolder: FolderItem | null;
  onCloseEditFolder: () => void;
  deletingFolder: FolderItem | null;
  onCloseDeleteFolder: () => void;
  onFolderDeleted: (deletedId: string) => void;
  sharingFolder: FolderItem | null;
  onCloseShareFolder: () => void;
  assetModal: ExplorerAssetModalState | null;
  onCloseAssetModal: () => void;
  onConfirmMoveAsset: (asset: ExplorerAsset, targetFolderId: string) => Promise<void>;
  onConfirmDeleteAsset: (asset: ExplorerAsset) => Promise<void>;
  isMutatingAsset: boolean;
  uploadModal: { open: boolean; files?: File[] };
  onCloseUploadModal: () => void;
}

function getAssetLabel(asset: ExplorerAsset): string {
  if (asset.kind === 'form') return asset.item.title;
  return asset.kind === 'table' ? asset.item.tableName : asset.item.originalName;
}

/**
 * Agrupa los diálogos modales del Explorador (Carpetas, Compartición, Formularios,
 * Subida contextual y mutaciones de activos: Renombrar, Hot-Swap, Ficha Técnica, Mover y Eliminar).
 */
export const ExplorerModals: React.FC<ExplorerModalsProps> = ({
  folderId,
  activeFolder,
  allFolders,
  uploadEnabled,
  canCreateForm,
  createOpen,
  onCreateOpenChange,
  createFormOpen,
  onCreateFormOpenChange,
  editingFolder,
  onCloseEditFolder,
  deletingFolder,
  onCloseDeleteFolder,
  onFolderDeleted,
  sharingFolder,
  onCloseShareFolder,
  assetModal,
  onCloseAssetModal,
  onConfirmMoveAsset,
  onConfirmDeleteAsset,
  isMutatingAsset,
  uploadModal,
  onCloseUploadModal,
}) => {
  const modalAsset = assetModal?.asset ?? null;

  return (
    <>
      <CreateFolderDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        parentFolder={activeFolder}
        allFolders={allFolders}
      />

      {canCreateForm && folderId && activeFolder ? (
        <CreateFormDialog
          open={createFormOpen}
          onOpenChange={onCreateFormOpenChange}
          folderId={folderId}
          folderName={activeFolder.name}
        />
      ) : null}

      <EditFolderDialog
        folder={editingFolder}
        allFolders={allFolders}
        open={Boolean(editingFolder)}
        onOpenChange={(open) => {
          if (!open) onCloseEditFolder();
        }}
      />

      <DeleteFolderDialog
        folder={deletingFolder}
        open={Boolean(deletingFolder)}
        onOpenChange={(open) => {
          if (!open) onCloseDeleteFolder();
        }}
        onDeleted={onFolderDeleted}
      />

      <ShareFolderDialog
        folder={sharingFolder}
        open={Boolean(sharingFolder)}
        onOpenChange={(open) => {
          if (!open) onCloseShareFolder();
        }}
      />

      {assetModal?.type === 'move' && modalAsset && modalAsset.kind !== 'form' ? (
        <MoveResourceDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) onCloseAssetModal();
          }}
          resourceKind={modalAsset.kind}
          resourceLabel={getAssetLabel(modalAsset)}
          currentFolderId={folderId ?? null}
          allFolders={allFolders}
          loading={isMutatingAsset}
          onConfirmMove={(targetFolderId) => onConfirmMoveAsset(modalAsset, targetFolderId)}
        />
      ) : null}

      {assetModal?.type === 'rename' && modalAsset && modalAsset.kind !== 'form' ? (
        <RenameAssetDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) onCloseAssetModal();
          }}
          kind={modalAsset.kind}
          assetId={modalAsset.item.id}
          shortCode={modalAsset.item.shortCode}
          currentName={getAssetLabel(modalAsset)}
        />
      ) : null}

      {assetModal?.type === 'hotswap' && modalAsset && modalAsset.kind !== 'form' ? (
        <HotSwapAssetDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) onCloseAssetModal();
          }}
          kind={modalAsset.kind}
          assetId={modalAsset.item.id}
          shortCode={modalAsset.item.shortCode}
          currentName={getAssetLabel(modalAsset)}
        />
      ) : null}

      {assetModal?.type === 'metadata' && modalAsset?.kind === 'image' ? (
        <ImageMetadataDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) onCloseAssetModal();
          }}
          imageId={modalAsset.item.id}
          imageName={modalAsset.item.originalName}
          initialMetadata={modalAsset.item.metadataCard}
        />
      ) : null}

      {assetModal?.type === 'metadata' && modalAsset?.kind === 'table' ? (
        <TableMetadataDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) onCloseAssetModal();
          }}
          tableId={modalAsset.item.id}
          tableName={modalAsset.item.tableName}
          columns={modalAsset.item.columns ?? []}
          initialMetadata={modalAsset.item.metadataCard}
        />
      ) : null}

      {assetModal?.type === 'metadata' && modalAsset?.kind === 'pdf' ? (
        <PdfMetadataDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) onCloseAssetModal();
          }}
          pdfId={modalAsset.item.id}
          pdfName={modalAsset.item.originalName}
          initialMetadata={modalAsset.item.metadataCard}
        />
      ) : null}

      {assetModal?.type === 'editForm' && modalAsset?.kind === 'form' ? (
        <EditFormDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) onCloseAssetModal();
          }}
          form={modalAsset.item}
          hydrateDetail={true}
        />
      ) : null}

      {assetModal?.type === 'delete' && modalAsset?.kind === 'form' ? (
        <DeleteFormDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) onCloseAssetModal();
          }}
          form={modalAsset.item}
        />
      ) : null}

      {assetModal?.type === 'delete' && modalAsset && modalAsset.kind !== 'form' ? (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) onCloseAssetModal();
          }}
          title="Eliminar archivo"
          size="sm"
          footer={
            <div className={styles.deleteConfirmActions}>
              <Button variant="ghost" onClick={onCloseAssetModal}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 size={14} />}
                loading={isMutatingAsset}
                onClick={() => void onConfirmDeleteAsset(modalAsset)}
              >
                Eliminar
              </Button>
            </div>
          }
        >
          <p className={styles.deleteConfirmText}>
            ¿Eliminar permanentemente <strong>{getAssetLabel(modalAsset)}</strong>?
          </p>
        </Dialog>
      ) : null}

      {uploadModal.open && activeFolder && uploadEnabled ? (
        <UploadDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) onCloseUploadModal();
          }}
          folder={activeFolder}
          initialFiles={uploadModal.files}
        />
      ) : null}
    </>
  );
};
