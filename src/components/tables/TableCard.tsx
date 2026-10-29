import React from 'react';
import { Table2, Download, Trash2, ArrowUpRight, FolderInput } from 'lucide-react';
import { formatBytes, formatDate } from '../../utils/formatters';
import { tablesService } from '../../services/tablesService';
import { Button } from '../common/Button';
import type { TableItem } from '../../types/media';
import styles from './TableCard.module.css';

interface TableCardProps {
  table: TableItem;
  onOpenStudio: (table: TableItem) => void;
  onDelete: (table: TableItem) => void;
  onMoveToFolder?: (table: TableItem) => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onOpenStudio,
  onDelete,
  onMoveToFolder,
}) => {
  const downloadUrl = tablesService.getDownloadUrl(table.shortCode);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(downloadUrl, '_blank');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(table);
  };

  return (
    <div
      className={styles.card}
      onClick={() => onOpenStudio(table)}
      data-testid={`table-card-${table.shortCode}`}
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <Table2 size={22} />
        </div>
        <div className={styles.titleArea}>
          <span className={styles.tableName} title={table.tableName}>
            {table.tableName}
          </span>
          <span className={styles.shortCode}>{table.shortCode}</span>
        </div>
      </div>

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
