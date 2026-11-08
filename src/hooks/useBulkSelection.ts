import { useState, useCallback, useMemo } from 'react';

/**
 * Hook para la gestión del estado de selección múltiple y modales de operaciones en lote.
 * @param items Lista de elementos actualmente disponibles o filtrados en la vista.
 */
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedSet.has(item.id)),
    [items, selectedSet]
  );

  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(items.map((item) => item.id));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const openBulkDelete = useCallback(() => setIsBulkDeleteOpen(true), []);
  const closeBulkDelete = useCallback(() => setIsBulkDeleteOpen(false), []);

  const openBulkMove = useCallback(() => setIsBulkMoveOpen(true), []);
  const closeBulkMove = useCallback(() => setIsBulkMoveOpen(false), []);

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.length,
    isSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    isBulkDeleteOpen,
    openBulkDelete,
    closeBulkDelete,
    isBulkMoveOpen,
    openBulkMove,
    closeBulkMove,
  };
}

