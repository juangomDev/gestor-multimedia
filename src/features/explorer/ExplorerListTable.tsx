import React from 'react';
import { Link } from 'react-router';
import { Folder, MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/DropdownMenu';
import { formatDate } from '../../utils/formatters';
import { isGeneralFolder, isSystemFolder } from './explorerRules';
import type { FolderItem } from '../../types/media';
import type { ExplorerAsset } from './AssetItemCard';
import { ExplorerListAssetRow } from './ExplorerListAssetRow';
import styles from './ExplorerListTable.module.css';

/**
 * Propiedades de la vista tabular del Explorador (`ExplorerListTable`).
 */
export interface ExplorerListTableProps {
  folders: FolderItem[];
  assets: ExplorerAsset[];
  canEditFolder: (folder: FolderItem) => boolean;
  canShareFolder: (folder: FolderItem) => boolean;
  canEditAssets: boolean;
  selectableAssets?: boolean;
  isAssetSelected?: (id: string) => boolean;
  onToggleAssetSelect?: (id: string) => void;
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

const FOLDER_SPINE = {
  container: styles.spineContainer,
  image: styles.spineImage,
  table: styles.spineTable,
  pdf: styles.spinePdf,
};

/**
 * Vista en lista tabular compacta con `content-visibility: auto`, lomo cromático por tipo,
 * `ShortCodeChip` copiable, selección múltiple y menú contextual Radix `⋯`.
 */
export const ExplorerListTable: React.FC<ExplorerListTableProps> = ({
  folders,
  assets,
  canEditFolder,
  canShareFolder,
  canEditAssets,
  selectableAssets = false,
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
  <div className={styles.wrap} data-testid="explorer-list-table">
    <table className={styles.table}>
      <thead>
        <tr>
          {selectableAssets ? <th aria-label="Selección" /> : null}
          <th>Nombre</th>
          <th>Código / Tipo</th>
          <th>Detalle</th>
          <th>Actualizado</th>
          <th aria-label="Acciones" />
        </tr>
      </thead>
      <tbody>
        {folders.map((folder) => {
          const locked = isSystemFolder(folder);
          const general = isGeneralFolder(folder);
          const editable = canEditFolder(folder);
          const shareable = canShareFolder(folder);
          const showMenu = !locked && (editable || shareable);

          return (
            <tr key={`fld-${folder.id}`} className={styles.row}>
              {selectableAssets ? <td className={styles.cell} /> : null}
              <td className={styles.cell}>
                <div className={styles.nameCell}>
                  <span className={`${styles.spineDot} ${FOLDER_SPINE[folder.type]}`} />
                  <Folder size={15} aria-hidden="true" />
                  <Link to={`/folder/${folder.id}`} className={styles.rowLink}>
                    {folder.name}
                  </Link>
                </div>
              </td>
              <td className={styles.cell}>
                {locked ? (
                  <Badge tone="accent" mono>
                    SISTEMA
                  </Badge>
                ) : (
                  <Badge artifactDot={folder.type}>{folder.type.toUpperCase()}</Badge>
                )}
              </td>
              <td className={`${styles.cell} ${styles.monoCell}`}>
                {folder.itemCount ?? 0} ítems
              </td>
              <td className={`${styles.cell} ${styles.monoCell}`}>
                {formatDate(folder.createdAt)}
              </td>
              <td className={`${styles.cell} ${styles.actionsCell}`}>
                {showMenu ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={styles.menuBtn}
                        aria-label={`Acciones de ${folder.name}`}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {shareable ? (
                        <DropdownMenuItem
                          icon={<Share2 size={14} />}
                          onSelect={() => onShareFolder(folder)}
                        >
                          Compartir
                        </DropdownMenuItem>
                      ) : null}
                      {editable ? (
                        <DropdownMenuItem
                          icon={<Pencil size={14} />}
                          onSelect={() => onEditFolder(folder)}
                        >
                          Editar
                        </DropdownMenuItem>
                      ) : null}
                      {editable && !general ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            tone="danger"
                            icon={<Trash2 size={14} />}
                            onSelect={() => onDeleteFolder(folder)}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </td>
            </tr>
          );
        })}

        {assets.map((asset) => (
          <ExplorerListAssetRow
            key={`${asset.kind}-${asset.item.id}`}
            asset={asset}
            canEditAssets={canEditAssets}
            selectableAssets={selectableAssets}
            selected={Boolean(selectableAssets && isAssetSelected?.(asset.item.id))}
            onToggleSelect={onToggleAssetSelect}
            onOpen={onOpenAsset}
            onRename={onRenameAsset}
            onHotSwap={onHotSwapAsset}
            onEditMetadata={onEditAssetMetadata}
            onMove={onMoveAsset}
            onDelete={onDeleteAsset}
          />
        ))}
      </tbody>
    </table>
  </div>
);
