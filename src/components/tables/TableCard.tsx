import React from 'react';
import { Table2, Download, Trash2, ArrowUpRight, FolderInput, FileText, Pencil, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { formatBytes, formatDate } from '../../utils/formatters';
import { tablesService } from '../../services/tablesService';
import { Button } from '../common/Button';
import type { TableItem } from '../../types/media';
import type { MetadataCard } from '../../types/api';
import styles from './TableCard.module.css';

/**
 * Propiedades de la tarjeta de dataset en el catálogo de tablas.
 */
export interface TableCardProps {
  table: TableItem;
  onOpenStudio: (table: TableItem) => void;
  onDelete: (table: TableItem) => void;
  onMoveToFolder?: (table: TableItem) => void;
  onEditMetadata?: (table: TableItem) => void;
  onRename?: (table: TableItem) => void;
  onHotSwap?: (table: TableItem) => void;
  isSelected?: boolean;
  onToggleSelect?: (table: TableItem) => void;
}

/**
 * Construye el texto de previsualización rápida (tooltip) de la Ficha Técnica de una tabla.
 */
function buildMetadataTooltip(meta: MetadataCard | null | undefined): string {
  if (!meta) return '';
  const parts: string[] = [];
  if (meta.title) parts.push(`Título: ${meta.title}`);
  if (meta.description) parts.push(`Descripción: ${meta.description}`);
  if (meta.unit) parts.push(`Unidad: ${meta.unit}`);
  if (Array.isArray(meta.tags) && meta.tags.length > 0) {
    parts.push(`Etiquetas: ${meta.tags.join(', ')}`);
  }
  if (meta.hasSummaryRows) {
    parts.push('Incluye filas de resumen/totales');
  }
  return parts.join(' | ');
}

/**
 * Tarjeta de dataset tabular con acceso directo al Data Studio, descarga intacta (`/t/:short_code?download=true`)
 * y badge/tooltip de previsualización de Ficha Técnica (`metadataCard`).
 */
export const TableCard: React.FC<TableCardProps> = ({
  table,
  onOpenStudio,
  onDelete,
  onMoveToFolder,
  onEditMetadata,
  onRename,
  onHotSwap,
  isSelected = false,
  onToggleSelect,
}) => {
  const downloadUrl = tablesService.getDownloadUrl(table.shortCode);
  const meta = (table.metadataCard as MetadataCard | null | undefined) || null;
  const hasMetadata = Boolean(
    meta &&
      (meta.title ||
        meta.description ||
        meta.unit ||
        (Array.isArray(meta.tags) && meta.tags.length > 0))
  );
  const metadataTooltip = buildMetadataTooltip(meta);

  /**
   * Abre la descarga directa del archivo original sin propagar el clic al contenedor.
   */
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(downloadUrl, '_blank');
  };

  /**
   * Dispara la eliminación del dataset sin abrir el Data Studio.
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(table);
  };

  return (
    <div
      className={styles.card}
      onClick={() => onOpenStudio(table)}
      data-testid={`table-card-${table.shortCode}`}
      style={isSelected ? { borderColor: 'var(--accent-primary)', boxShadow: '0 0 0 1px var(--accent-primary)' } : undefined}
    >
      <div className={styles.header}>
        {onToggleSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(table);
            }}
            aria-label={isSelected ? `Deseleccionar ${table.tableName}` : `Seleccionar ${table.tableName}`}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
        )}
        <div className={styles.iconWrapper}>
          <Table2 size={22} />
        </div>
        <div className={styles.titleArea}>
          <span className={styles.tableName} title={table.tableName}>
            {table.tableName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className={styles.shortCode}>{table.shortCode}</span>
            {hasMetadata && (
              <span
                data-testid={`metadata-badge-${table.shortCode}`}
                title={metadataTooltip}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 9999,
                  background: 'rgba(139, 92, 246, 0.16)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                <FileText size={11} />
                <span>{meta?.title || 'Ficha Técnica'}</span>
                {meta?.unit ? <span>({meta.unit})</span> : null}
              </span>
            )}
          </div>
        </div>
      </div>

      {hasMetadata && meta?.description && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={metadataTooltip}
        >
          {meta.description}
        </div>
      )}

      <div className={styles.statsRow}>
        <span className={styles.rowsPill}>{table.rowCount.toLocaleString()} filas</span>
        <span>{formatBytes(table.sizeBytes)}</span>
        <span>{formatDate(table.createdAt)}</span>
      </div>

      {table.columns && table.columns.length > 0 && (
        <div className={styles.columnsList}>
          {table.columns.slice(0, 4).map((col, idx) => (
            <span key={idx} className={styles.columnTag}>
              {col}
            </span>
          ))}
          {table.columns.length > 4 && (
            <span className={styles.columnTag}>+{table.columns.length - 4} más</span>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <Button
          variant="primary"
          size="sm"
          icon={<ArrowUpRight size={14} />}
          onClick={() => onOpenStudio(table)}
        >
          Data Studio
        </Button>

        <div style={{ display: 'flex', gap: 6 }}>
          {onRename && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Pencil size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                onRename(table);
              }}
              title="Renombrar tabla"
              aria-label="Renombrar"
            />
          )}
          {onHotSwap && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                onHotSwap(table);
              }}
              title="Reemplazar archivo en caliente (Hot-Swap)"
              aria-label="Reemplazar en caliente"
            />
          )}
          {onEditMetadata && (
            <Button
              variant="ghost"
              size="sm"
              icon={<FileText size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                onEditMetadata(table);
              }}
              title="Editar Ficha Técnica (metadataCard)"
              aria-label="Editar Ficha Técnica"
            />
          )}
          {onMoveToFolder && (
            <Button
              variant="ghost"
              size="sm"
              icon={<FolderInput size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                onMoveToFolder(table);
              }}
              title="Mover a otra carpeta"
              aria-label="Mover a carpeta"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleDownload}
            title="Descargar archivo original"
            aria-label="Descargar"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={handleDelete}
            title="Eliminar tabla"
            aria-label="Eliminar"
          />
        </div>
      </div>
    </div>
  );
};
