import React from 'react';
import { FolderItemCard } from './FolderItemCard';
import { AssetItemCard, type ExplorerAsset } from './AssetItemCard';
import type { FolderCategory, FolderItem } from '../../types/media';
import styles from './ExplorerPage.module.css';

/**
 * Propiedades de las secciones en cuadrícula del Explorador (`ExplorerGridSections`).
 */
export interface ExplorerGridSectionsProps {
  isInsideFolder: boolean;
  activeFolderType: FolderCategory | undefined;
  folders: FolderItem[];
  assets: ExplorerAsset[];
  canEditFolder: (folder: FolderItem) => boolean;
  canShareFolder: (folder: FolderItem) => boolean;
  canEditAssets: boolean;
  supportsBulk: boolean;
  selectedCount: number;
  isAssetSelected: (id: string) => boolean;
  onToggleAssetSelect: (id: string) => void;
  onShareFolder: (folder: FolderItem) => void;
  onEditFolder: (folder: FolderItem) => void;
  onDeleteFolder: (folder: FolderItem) => void;
  onOpenAsset: (asset: ExplorerAsset) => void;
  onRenameAsset?: (asset: ExplorerAsset) => void;
  onHotSwapAsset?: (asset: ExplorerAsset) => void;
  onEditAssetMetadata?: (asset: ExplorerAsset) => void;
  onMoveAsset: (asset: ExplorerAsset) => void;
  onDeleteAsset: (asset: ExplorerAsset) => void;
}

/**
 * Renderiza en modo cuadrícula las secciones de carpetas y activos tipados
 * con separación visual editorial y soporte de selección múltiple en `IMAGE` / `TABLE`.
 */
export const ExplorerGridSections: React.FC<ExplorerGridSectionsProps> = React.memo(({
  isInsideFolder,
  activeFolderType,
  folders,
  assets,
  canEditFolder,
  canShareFolder,
  canEditAssets,
  supportsBulk,
  selectedCount,
  isAssetSelected,
  onToggleAssetSelect,
  onShareFolder,
  onEditFolder,
  onDeleteFolder,
  onOpenAsset,
  onRenameAsset,
  onHotSwapAsset,
  onEditAssetMetadata,
  onMoveAsset,
  onDeleteAsset,
}) => (
  <>
    {folders.length > 0 ? (
      <section className={styles.section} aria-label="Carpetas">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {isInsideFolder ? 'Subcarpetas' : 'Carpetas principales'}
          </h2>
          <span className={styles.sectionCount}>{folders.length}</span>
        </div>
        <div className={styles.folderGrid}>
          {folders.map((folder) => (
            <FolderItemCard
              key={folder.id}
              folder={folder}
              canEdit={canEditFolder(folder)}
              canShare={canShareFolder(folder)}
              onShare={onShareFolder}
              onEdit={onEditFolder}
              onDelete={onDeleteFolder}
            />
          ))}
        </div>
      </section>
    ) : null}

    {assets.length > 0 ? (
      <section className={styles.section} aria-label="Archivos">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {activeFolderType === 'image'
              ? 'Imágenes'
              : activeFolderType === 'table'
              ? 'Tablas y formularios'
              : 'Documentos PDF'}
          </h2>
          <span className={styles.sectionCount}>{assets.length}</span>
        </div>
        <div className={styles.assetGrid}>
          {assets.map((asset) => {
            const canSelectCard =
              supportsBulk &&
              (asset.kind === 'image' || asset.kind === 'table' || asset.kind === 'pdf');
            return (
              <AssetItemCard
                key={`${asset.kind}-${asset.item.id}`}
                asset={asset}
                canEdit={canEditAssets}
                selectable={canSelectCard}
                selected={canSelectCard ? isAssetSelected(asset.item.id) : false}
                hasAnySelection={selectedCount > 0}
                onToggleSelect={onToggleAssetSelect}
                onOpen={onOpenAsset}
                onRename={onRenameAsset}
                onHotSwap={onHotSwapAsset}
                onEditMetadata={onEditAssetMetadata}
                onMove={onMoveAsset}
                onDelete={onDeleteAsset}
              />
            );
          })}
        </div>
      </section>
    ) : null}
  </>
));
