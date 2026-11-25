import React from 'react';
import {
  Check,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  FolderInput,
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
import { formatBytes } from '../../utils/formatters';
import type { ImageItem, PdfItem, TableItem } from '../../types/media';
import type { FormDefinition } from '../../types/forms';
import styles from './AssetItemCard.module.css';

/**
 * Unión discriminada de cualquier activo renderizado dentro del Explorador Unificado.
 */
export type ExplorerAsset =
  | { kind: 'image'; item: ImageItem }
  | { kind: 'table'; item: TableItem }
  | { kind: 'pdf'; item: PdfItem }
  | { kind: 'form'; item: FormDefinition };

/**
 * Propiedades de la tarjeta editorial de activo (`AssetItemCard`).
 */
export interface AssetItemCardProps {
  asset: ExplorerAsset;
  canEdit: boolean;
  selectable?: boolean;
  selected?: boolean;
  hasAnySelection?: boolean;
  onToggleSelect?: (id: string) => void;
  onOpen: (asset: ExplorerAsset) => void;
  onRename?: (asset: ExplorerAsset) => void;
  onHotSwap?: (asset: ExplorerAsset) => void;
  onEditMetadata?: (asset: ExplorerAsset) => void;
  onMove?: (asset: ExplorerAsset) => void;
  onDelete?: (asset: ExplorerAsset) => void;
}

function getTableExtLabel(tableName: string): string {
  if (/\.json$/i.test(tableName)) return 'JSON';
  if (/\.xlsx?$/i.test(tableName)) return 'XLSX';
  return 'CSV';
}

/**
 * Tarjeta editorial con `content-visibility: auto` para Imágenes (miniatura WebP + 1px inset),
 * Tablas (`.csv/.xlsx/.json` + Ficha Técnica), PDFs (páginas + `Escaneado`) y Formularios (`_count.entries`).
 * Mantiene la regla de baja fricción: clic principal abre, `ShortCodeChip` copia y `⋯` agrupa acciones.
 */
export const AssetItemCard: React.FC<AssetItemCardProps> = ({
  asset,
  canEdit,
  selectable = false,
  selected = false,
  hasAnySelection = false,
  onToggleSelect,
  onOpen,
  onRename,
  onHotSwap,
  onEditMetadata,
  onMove,
  onDelete,
}) => {
  const id = asset.item.id;

  if (asset.kind === 'form') {
    const entriesTotal = asset.item._count?.entries ?? asset.item.entriesCount ?? 0;
    return (
      <article className={`${styles.card} ${styles.spineForm}`} data-testid={`form-card-${id}`}>
        <div className={styles.headerRow}>
          <button type="button" className={styles.titleBtn} onClick={() => onOpen(asset)}>
            <ClipboardCheck size={15} aria-hidden="true" />
            <span className={styles.titleText} title={asset.item.title}>
              {asset.item.title}
            </span>
          </button>
          <Badge artifactDot="form" mono>
            FORM
          </Badge>
        </div>

        <div className={styles.footerRow}>
          <span className={styles.metaText}>/{asset.item.slug}</span>
          <span className={styles.metaText}>
            {entriesTotal} {entriesTotal === 1 ? 'entrada' : 'entradas'}
          </span>
        </div>
      </article>
    );
  }

  const name =
    asset.kind === 'table' ? asset.item.tableName : asset.item.originalName;
  const downloadUrl =
    asset.kind === 'image'
      ? imagesService.getImageDownloadUrl(asset.item.shortCode)
      : asset.kind === 'table'
      ? tablesService.getDownloadUrl(asset.item.shortCode)
      : pdfsService.getPdfDownloadUrl(asset.item.shortCode);

  const spineClass =
    asset.kind === 'table'
      ? styles.spineTable
      : asset.kind === 'pdf'
      ? styles.spinePdf
      : '';

  const selectControl = selectable && onToggleSelect ? (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`Seleccionar ${name}`}
      className={`${styles.selectBox} ${asset.kind !== 'image' ? styles.selectBoxInline : ''} ${
        hasAnySelection ? styles.selectBoxVisible : ''
      } ${selected ? styles.selectBoxChecked : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelect(id);
      }}
    >
      {selected ? <Check size={13} /> : null}
    </button>
  ) : null;

  return (
    <article
      className={`${styles.card} ${spineClass} ${selected ? styles.cardSelected : ''}`}
      data-testid={`asset-card-${asset.kind}-${id}`}
    >
      {asset.kind === 'image' ? (
        <div className={styles.thumbWrap} onClick={() => onOpen(asset)}>
          {selectControl}
          <img
            src={imagesService.getImageVariantUrl(asset.item, 'thumb')}
            alt={asset.item.originalName}
            loading="lazy"
            className={styles.thumbImg}
          />
        </div>
      ) : null}

      <div className={styles.headerRow}>
        {asset.kind !== 'image' ? selectControl : null}
        <button type="button" className={styles.titleBtn} onClick={() => onOpen(asset)}>
          {asset.kind === 'table' ? <Table2 size={15} aria-hidden="true" /> : null}
          {asset.kind === 'pdf' ? <FileText size={15} aria-hidden="true" /> : null}
          <span className={styles.titleText} title={name}>
            {name}
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label={`Acciones de ${name}`}
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
            {canEdit && onRename ? (
              <DropdownMenuItem icon={<Pencil size={14} />} onSelect={() => onRename(asset)}>
                Renombrar
              </DropdownMenuItem>
            ) : null}
            {canEdit && onHotSwap ? (
              <DropdownMenuItem icon={<RefreshCw size={14} />} onSelect={() => onHotSwap(asset)}>
                Reemplazar (Hot-Swap)
              </DropdownMenuItem>
            ) : null}
            {canEdit &&
            onEditMetadata &&
            (asset.kind === 'image' || asset.kind === 'table' || asset.kind === 'pdf') ? (
              <DropdownMenuItem icon={<Tags size={14} />} onSelect={() => onEditMetadata(asset)}>
                Ficha técnica
              </DropdownMenuItem>
            ) : null}
            {canEdit && onMove ? (
              <DropdownMenuItem icon={<FolderInput size={14} />} onSelect={() => onMove(asset)}>
                Mover a carpeta
              </DropdownMenuItem>
            ) : null}
            {canEdit && onDelete ? (
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
      </div>

      {asset.kind === 'table' ? (
        <div className={styles.badgesRow}>
          <Badge artifactDot="table" mono>
            {getTableExtLabel(asset.item.tableName)}
          </Badge>
          <span className={styles.metaText}>{asset.item.rowCount} filas</span>
          {asset.item.metadataCard &&
          typeof asset.item.metadataCard === 'object' &&
          'title' in asset.item.metadataCard &&
          asset.item.metadataCard.title ? (
            <Badge tone="accent">Ficha técnica</Badge>
          ) : null}
        </div>
      ) : null}

      {asset.kind === 'pdf' ? (
        <div className={styles.badgesRow}>
          <Badge artifactDot="pdf" mono>
            {asset.item.pageCount} pág.
          </Badge>
          {asset.item.isScanned ? <Badge tone="warn">Escaneado</Badge> : null}
        </div>
      ) : null}

      <div className={styles.footerRow}>
        <ShortCodeChip
          prefix={asset.kind === 'image' ? 'i' : asset.kind === 'table' ? 't' : 'p'}
          shortCode={asset.item.shortCode}
          copyValue={asset.item.url}
        />
        <span className={styles.metaText}>{formatBytes(asset.item.sizeBytes)}</span>
      </div>
    </article>
  );
};
