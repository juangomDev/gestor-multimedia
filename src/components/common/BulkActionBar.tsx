import React from 'react';
import { FolderInput, Trash2, X, CheckSquare } from 'lucide-react';
import styles from './BulkActionBar.module.css';

/**
 * Propiedades de la barra contextual flotante para operaciones en lote.
 */
export interface BulkActionBarProps {
  /** Cantidad de elementos actualmente seleccionados. */
  selectedCount: number;
  /** Cantidad total de elementos visibles en la vista. */
  totalCount: number;
  /** Callback para limpiar y desmarcar toda la selección. */
  onClearSelection: () => void;
  /** Callback opcional para seleccionar todos los elementos visibles. */
  onSelectAll?: () => void;
  /** Callback al solicitar mover los elementos en lote. */
  onOpenBulkMove: () => void;
  /** Callback al solicitar eliminar los elementos en lote. */
  onOpenBulkDelete: () => void;
  /** Etiqueta descriptiva del tipo de activos (ej. 'imágenes', 'tablas'). */
  itemLabel?: string;
}

/**
 * Barra contextual flotante que aparece cuando uno o más activos están seleccionados,
 * ofreciendo acciones masivas en lote (`Mover a carpeta`, `Eliminar`, `Seleccionar todo`).
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  onOpenBulkMove,
  onOpenBulkDelete,
  itemLabel = 'elementos',
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className={styles.barContainer}
      role="region"
      aria-label="Acciones en lote para elementos seleccionados"
    >
      <div className={styles.countPill}>
        <span className={styles.countNumber}>{selectedCount}</span>
        <span>de {totalCount} {itemLabel}</span>
      </div>

      <div className={styles.actionsGroup}>
        {onSelectAll && selectedCount < totalCount && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onSelectAll}
            title="Seleccionar todos los elementos"
          >
            <CheckSquare size={14} />
            <span>Todos</span>
          </button>
        )}

        <button
          type="button"
          className={styles.actionBtn}
          onClick={onOpenBulkMove}
          title="Mover elementos seleccionados a otra carpeta"
        >
          <FolderInput size={14} />
          <span>Mover</span>
        </button>

        <button
          type="button"
          className={`${styles.actionBtn} ${styles.dangerBtn}`}
          onClick={onOpenBulkDelete}
          title="Eliminar elementos seleccionados permanentemente"
        >
          <Trash2 size={14} />
          <span>Eliminar</span>
        </button>
      </div>

      <button
        type="button"
        className={styles.clearBtn}
        onClick={onClearSelection}
        aria-label="Cancelar selección"
        title="Cancelar selección"
      >
        <X size={16} />
      </button>
    </div>
  );
};

