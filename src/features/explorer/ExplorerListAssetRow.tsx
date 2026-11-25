import React from 'react';
import {
  Check,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  FolderInput,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Table2,
  Tags,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { ShortCodeChip } from '../../components/ui/ShortCodeChip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/DropdownMenu';
import { imagesService } from '../../services/imagesService';
import { tablesService } from '../../services/tablesService';
import { pdfsService } from '../../services/pdfsService';
import { formatBytes, formatDate } from '../../utils/formatters';
import type { ExplorerAsset } from './AssetItemCard';
import styles from './ExplorerListTable.module.css';

/**
 * Propiedades de una fila de activo dentro de `ExplorerListTable`.
 */
export interface ExplorerListAssetRowProps {
  asset: ExplorerAsset;
  canEditAssets: boolean;
  selectableAssets: boolean;
  selected: boolean;
  onToggleSelect?: (id: string) => void;
  onOpen: (asset: ExplorerAsset) => void;
  onRename?: (asset: ExplorerAsset) => void;
  onHotSwap?: (asset: ExplorerAsset) => void;
  onEditMetadata?: (asset: ExplorerAsset) => void;
  onMove: (asset: ExplorerAsset) => void;
  onDelete: (asset: ExplorerAsset) => void;
}

/**
 * Fila tabular de activo (`IMAGE`, `TABLE`, `PDF`, `FORM`) con `content-visibility: auto`,
 * `ShortCodeChip` clicable y menú contextual Radix `⋯`.
 */
export const ExplorerListAssetRow: React.FC<ExplorerListAssetRowProps> = ({
  asset,
  canEditAssets,
  selectableAssets,
  selected,
  onToggleSelect,
  onOpen,
  onRename,
  onHotSwap,
  onEditMetadata,
  onMove,
  onDelete,
}) => {
  const id = asset.item.id;
  const isForm = asset.kind === 'form';
  const canSelectRow =
    selectableAssets &&
    (asset.kind === 'image' || asset.kind === 'table' || asset.kind === 'pdf');
  const title =
    asset.kind === 'form'
      ? asset.item.title
      : asset.kind === 'table'
      ? asset.item.tableName
      : asset.item.originalName;
  const downloadUrl =
    asset.kind === 'image'
      ? imagesService.getImageDownloadUrl(asset.item.shortCode)
      : asset.kind === 'table'
      ? tablesService.getDownloadUrl(asset.item.shortCode)
      : asset.kind === 'pdf'
      ? pdfsService.getPdfDownloadUrl(asset.item.shortCode)
      : null;

  return (
    <tr className={`${styles.row} ${selected ? styles.rowSelected : ''}`}>
      {selectableAssets ? (
        <td className={styles.cell}>
          {canSelectRow && onToggleSelect ? (
            <button
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={`Seleccionar ${title}`}
              className={`${styles.checkBtn} ${selected ? styles.checkBtnActive : ''}`}
              onClick={() => onToggleSelect(id)}
            >
              {selected ? <Check size={12} /> : null}
            </button>
          ) : null}
        </td>
      ) : null}
      <td className={styles.cell}>
        <div className={styles.nameCell}>
          <span
            className={`${styles.spineDot} ${
              asset.kind === 'image'
                ? styles.spineImage
                : asset.kind === 'table'
                ? styles.spineTable
                : asset.kind === 'pdf'
                ? styles.spinePdf
                : styles.spineForm
            }`}
          />
          {asset.kind === 'image' ? <ImageIcon size={15} aria-hidden="true" /> : null}
          {asset.kind === 'table' ? <Table2 size={15} aria-hidden="true" /> : null}
          {asset.kind === 'pdf' ? <FileText size={15} aria-hidden="true" /> : null}
          {asset.kind === 'form' ? <ClipboardCheck size={15} aria-hidden="true" /> : null}
          <button type="button" className={styles.rowLink} onClick={() => onOpen(asset)}>
            {title}
          </button>
        </div>
      </td>
      <td className={styles.cell}>
        {isForm ? (
          <Badge artifactDot="form" mono>
            /{asset.item.slug}
          </Badge>
        ) : (
          <ShortCodeChip
            prefix={asset.kind === 'image' ? 'i' : asset.kind === 'table' ? 't' : 'p'}
            shortCode={asset.item.shortCode}
            copyValue={asset.item.url}
          />
        )}
      </td>
      <td className={`${styles.cell} ${styles.monoCell}`}>
        {asset.kind === 'form'
          ? `${asset.item._count?.entries ?? asset.item.entriesCount ?? 0} entradas`
          : asset.kind === 'table'
          ? `${asset.item.rowCount} filas · ${formatBytes(asset.item.sizeBytes)}`
          : asset.kind === 'pdf'
          ? `${asset.item.pageCount} pág. · ${formatBytes(asset.item.sizeBytes)}`
          : formatBytes(asset.item.sizeBytes)}
      </td>
      <td className={`${styles.cell} ${styles.monoCell}`}>
        {formatDate(asset.item.updatedAt || asset.item.createdAt)}
      </td>
      <td className={`${styles.cell} ${styles.actionsCell}`}>
        {!isForm ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={styles.menuBtn}
                aria-label={`Acciones de ${title}`}
              >
                <MoreHorizontal size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem icon={<ExternalLink size={14} />} onSelect={() => onOpen(asset)}>
                Abrir
              </DropdownMenuItem>
              {downloadUrl ? (
                <DropdownMenuItem
                  icon={<Download size={14} />}
                  onSelect={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')}
                >
                  Descargar original
                </DropdownMenuItem>
              ) : null}
              {canEditAssets && onRename ? (
                <DropdownMenuItem icon={<Pencil size={14} />} onSelect={() => onRename(asset)}>
                  Renombrar
                </DropdownMenuItem>
              ) : null}
              {canEditAssets && onHotSwap ? (
                <DropdownMenuItem icon={<RefreshCw size={14} />} onSelect={() => onHotSwap(asset)}>
                  Reemplazar (Hot-Swap)
                </DropdownMenuItem>
              ) : null}
              {canEditAssets &&
              onEditMetadata &&
              (asset.kind === 'image' || asset.kind === 'table' || asset.kind === 'pdf') ? (
                <DropdownMenuItem icon={<Tags size={14} />} onSelect={() => onEditMetadata(asset)}>
                  Ficha técnica
                </DropdownMenuItem>
              ) : null}
              {canEditAssets ? (
                <DropdownMenuItem icon={<FolderInput size={14} />} onSelect={() => onMove(asset)}>
                  Mover a carpeta
                </DropdownMenuItem>
              ) : null}
              {canEditAssets ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    tone="danger"
                    icon={<Trash2 size={14} />}
                    onSelect={() => onDelete(asset)}
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
};
