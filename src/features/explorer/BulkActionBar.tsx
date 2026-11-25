import React, { useState } from 'react';
import { CheckSquare, FolderInput, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../context/useToast';
import {
  useBulkDeleteImagesMutation,
  useBulkDeletePdfsMutation,
  useBulkDeleteTablesMutation,
  useBulkMoveImagesMutation,
  useBulkMovePdfsMutation,
  useBulkMoveTablesMutation,
} from '../../queries/useBulkMediaMutations';
import { MoveResourceDialog } from './MoveResourceDialog';
import type { BulkActionReport, FolderItem, MediaCategory } from '../../types/media';
import styles from './BulkActionBar.module.css';

/**
 * Propiedades de la barra flotante de acciones en lote (`BulkActionBar`) para `IMAGE`, `TABLE` y `PDF`.
 */
export interface BulkActionBarProps {
  resourceKind: MediaCategory;
  selectedIds: string[];
  totalSelectableCount: number;
  allSelectableIds: string[];
  currentFolderId: string;
  allFolders: FolderItem[];
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
}

/**
 * Barra flotante inferior para `bulk-move` y `bulk-delete` (hasta 50 IDs) en carpetas `IMAGE`, `TABLE` y `PDF`,
 * con confirmación y reporte detallado de éxitos y fallos parciales devueltos por `monolith-backend`.
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  resourceKind,
  selectedIds,
  totalSelectableCount,
  allSelectableIds,
  currentFolderId,
  allFolders,
  onSelectAll,
  onClear,
}) => {
  const { showToast } = useToast();
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [report, setReport] = useState<{ title: string; data: BulkActionReport } | null>(null);

  const bulkDeleteImages = useBulkDeleteImagesMutation();
  const bulkMoveImages = useBulkMoveImagesMutation();
  const bulkDeleteTables = useBulkDeleteTablesMutation();
  const bulkMoveTables = useBulkMoveTablesMutation();
  const bulkDeletePdfs = useBulkDeletePdfsMutation();
  const bulkMovePdfs = useBulkMovePdfsMutation();

  if (selectedIds.length === 0 && !report) return null;

  const isMoving = bulkMoveImages.isPending || bulkMoveTables.isPending || bulkMovePdfs.isPending;
  const isDeleting =
    bulkDeleteImages.isPending || bulkDeleteTables.isPending || bulkDeletePdfs.isPending;
  const isBusy = isMoving || isDeleting;

  const handleBulkResult = (actionLabel: string, data: BulkActionReport) => {
    onClear();
    if (data.failed && data.failed.length > 0) {
      setReport({ title: `Reporte de ${actionLabel}`, data });
      return;
    }
    showToast(
      `${data.successful.length} elemento${data.successful.length === 1 ? '' : 's'} procesado${
        data.successful.length === 1 ? '' : 's'
      } correctamente`,
      'success'
    );
  };

  const handleBulkMove = async (targetFolderId: string) => {
    const res =
      resourceKind === 'image'
        ? await bulkMoveImages.mutateAsync({ ids: selectedIds, targetFolderId })
        : resourceKind === 'table'
        ? await bulkMoveTables.mutateAsync({ ids: selectedIds, targetFolderId })
        : await bulkMovePdfs.mutateAsync({ ids: selectedIds, targetFolderId });
    handleBulkResult('traslado en lote', res);
  };

  const handleBulkDelete = async () => {
    try {
      const res =
        resourceKind === 'image'
          ? await bulkDeleteImages.mutateAsync(selectedIds)
          : resourceKind === 'table'
          ? await bulkDeleteTables.mutateAsync(selectedIds)
          : await bulkDeletePdfs.mutateAsync(selectedIds);
      setConfirmDeleteOpen(false);
      handleBulkResult('eliminación en lote', res);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      showToast(detail || message || 'No se pudo completar la eliminación en lote.', 'error');
    }
  };

  return (
    <>
      {selectedIds.length > 0 ? (
        <div
          className={styles.bar}
          role="region"
          aria-label="Acciones en lote"
          data-testid="bulk-action-bar"
        >
          <div className={styles.countGroup}>
            <Badge tone="accent" mono>
              {selectedIds.length} / 50
            </Badge>
            <span className={styles.countText}>
              {selectedIds.length === 1 ? '1 seleccionado' : `${selectedIds.length} seleccionados`}
            </span>
          </div>

          <div className={styles.actions}>
            {selectedIds.length < Math.min(totalSelectableCount, 50) ? (
              <Button
                variant="ghost"
                size="sm"
                icon={<CheckSquare size={14} />}
                onClick={() => onSelectAll(allSelectableIds)}
                disabled={isBusy}
              >
                Seleccionar todo
              </Button>
            ) : null}

            <Button
              variant="secondary"
              size="sm"
              icon={<FolderInput size={14} />}
              onClick={() => setMoveOpen(true)}
              disabled={isBusy}
            >
              Mover
            </Button>

            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isBusy}
            >
              Eliminar
            </Button>

            <Button
              variant="ghost"
              size="icon"
              icon={<X size={15} />}
              aria-label="Limpiar selección"
              onClick={onClear}
              disabled={isBusy}
            />
          </div>
        </div>
      ) : null}

      <MoveResourceDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        resourceKind={resourceKind}
        resourceLabel={`${selectedIds.length} elemento(s)`}
        currentFolderId={currentFolderId}
        allFolders={allFolders}
        loading={isMoving}
        onConfirmMove={handleBulkMove}
      />

      <Dialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Eliminar ${selectedIds.length} elemento(s)`}
        description="Esta operación eliminará permanentemente los archivos seleccionados."
        size="sm"
        footer={
          <div className={styles.actions}>
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={isBusy}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={14} />}
              loading={isDeleting}
              onClick={() => void handleBulkDelete()}
            >
              Confirmar eliminación
            </Button>
          </div>
        }
      >
        <p className={styles.countText}>
          Se solicitará la eliminación en lote de {selectedIds.length}{' '}
          {resourceKind === 'image'
            ? 'imagen(es)'
            : resourceKind === 'table'
            ? 'tabla(s)'
            : 'documento(s) PDF'}
          .
        </p>
      </Dialog>

      <Dialog
        open={Boolean(report)}
        onOpenChange={(open) => {
          if (!open) setReport(null);
        }}
        title={report?.title ?? 'Reporte de operación'}
        size="sm"
        footer={
          <Button variant="primary" onClick={() => setReport(null)}>
            Entendido
          </Button>
        }
      >
        {report ? (
          <div className={styles.reportStack}>
            <div className={styles.summaryRow}>
              <Badge tone="ok" mono>
                Éxitos: {report.data.successful.length}
              </Badge>
              <Badge tone="danger" mono>
                Errores: {report.data.failed.length}
              </Badge>
            </div>
            <div className={styles.failedList}>
              {report.data.failed.map((fail) => (
                <div key={fail.id} className={styles.failedItem}>
                  <span className={styles.failedId}>{fail.id}:</span> {fail.reason}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
};
