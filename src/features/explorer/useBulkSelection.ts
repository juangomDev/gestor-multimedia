import { useCallback, useState } from 'react';
import { MAX_BULK_ITEMS } from './explorerRules';

/**
 * Contrato de estado y acciones para selección múltiple en carpetas `IMAGE` y `TABLE`.
 */
export interface BulkSelectionState {
  selectedIds: string[];
  selectedCount: number;
  maxLimit: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectMany: (ids: string[]) => void;
  clear: () => void;
}

/**
 * Hook de selección múltiple acotada al límite operativo de `monolith-backend` (máx. 50 IDs).
 *
 * @param maxLimit Tope máximo de elementos seleccionables simultáneamente (por defecto `50`).
 */
export function useBulkSelection(maxLimit: number = MAX_BULK_ITEMS): BulkSelectionState {
  const [selectedSet, setSelectedSet] = useState<Set<string>>(() => new Set());

  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  const toggle = useCallback(
    (id: string) => {
      setSelectedSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else if (next.size < maxLimit) {
          next.add(id);
        }
        return next;
      });
    },
    [maxLimit]
  );

  const selectMany = useCallback(
    (ids: string[]) => {
      setSelectedSet(new Set(ids.slice(0, maxLimit)));
    },
    [maxLimit]
  );

  const clear = useCallback(() => {
    setSelectedSet(new Set());
  }, []);

  return {
    selectedIds: Array.from(selectedSet),
    selectedCount: selectedSet.size,
    maxLimit,
    isSelected,
    toggle,
    selectMany,
    clear,
  };
}
