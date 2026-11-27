import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/useToast';
import { useDeleteFormEntryMutation } from '../../queries/useFormsQueries';
import type { DeleteFormEntryResult, FormEntryStatus } from '../../types/forms';
import styles from './CreateFormDialog.module.css';

/**
 * Propiedades del diálogo de confirmación de borrado individual de una entrada de formulario
 * (`DeleteFormEntryDialog`), reutilizable en `FormInboxPage` y tablas abiertas de `DataStudioPage`.
 */
export interface DeleteFormEntryDialogProps {
  /** Controla la apertura del diálogo. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
  /** UUID de la entrada (`FormEntry.id`) a eliminar permanentemente. */
  entryId: string;
  /** UUID opcional del formulario propietario para invalidación específica de su bandeja. */
  formId?: string;
  /** Estado actual de la entrada (`NEW`, `VALID` o `INVALID`) para advertencia contextual. */
  status?: FormEntryStatus | string | null;
  /** Resumen breve legible de la entrada o fila seleccionada. */
  summaryLabel?: string | null;
  /** Indica si la tabla abierta es maestro-detalle (múltiples filas por entrada). */
  isMasterDetailTable?: boolean;
  /** Callback invocado tras confirmar la eliminación en el servidor. */
  onDeleted?: (result: DeleteFormEntryResult) => void;
}

/**
 * Diálogo de confirmación explícita para `DELETE /api/v1/forms/entries/:id`.
 * Advierte que la eliminación es permanente en PostgreSQL y remueve todas las filas
 * sincronizadas en el artefacto `.data.json.gz` de la tabla abierta vinculada.
 */
export const DeleteFormEntryDialog: React.FC<DeleteFormEntryDialogProps> = ({
  open,
  onOpenChange,
  entryId,
  formId,
  status,
  summaryLabel,
  isMasterDetailTable = false,
  onDeleted,
}) => {
  const { showToast } = useToast();
  const deleteEntry = useDeleteFormEntryMutation(formId);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const normalizedStatus = status ? String(status).toUpperCase() : null;
  const statusTone =
    normalizedStatus === 'VALID'
      ? 'ok'
      : normalizedStatus === 'INVALID'
      ? 'danger'
      : normalizedStatus === 'NEW'
      ? 'warn'
      : 'neutral';

  const handleConfirmDelete = async () => {
    setErrorMsg(null);
    try {
      const result = await deleteEntry.mutateAsync(entryId);
      const rowsNote =
        result.removedTableRows > 0
          ? ` (${result.removedTableRows} ${
              result.removedTableRows === 1 ? 'fila removida' : 'filas removidas'
            } de la tabla abierta)`
          : '';
      showToast(`Entrada eliminada correctamente${rowsNote}.`, 'info');
      onOpenChange(false);
      onDeleted?.(result);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo eliminar la entrada.';
      setErrorMsg(detail || fallback);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setErrorMsg(null);
        onOpenChange(next);
      }}
      title="Eliminar entrada"
      description="Esta acción es irreversible y sincroniza de inmediato la tabla abierta vinculada."
      size="sm"
      footer={
        <div className={styles.footerActions}>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleteEntry.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={14} />}
            loading={deleteEntry.isPending}
            onClick={() => void handleConfirmDelete()}
            data-testid="delete-entry-confirm-btn"
          >
            Eliminar entrada
          </Button>
        </div>
      }
    >
      <div className={styles.form}>
        <div className={styles.dangerNotice} role="alert">
          <AlertTriangle size={18} aria-hidden="true" className={styles.dangerIcon} />
          <div>
            <strong>Eliminación permanente del registro</strong>
            <ul className={styles.impactList}>
              {summaryLabel ? (
                <li>
                  Registro seleccionado:{' '}
                  <span className={styles.impactMono}>{summaryLabel}</span>
                </li>
              ) : null}
              <li>
                Identificador:{' '}
                <span className={styles.impactMono}>{entryId}</span>
                {normalizedStatus ? (
                  <>
                    {' '}
                    <Badge tone={statusTone} mono>
                      {normalizedStatus}
                    </Badge>
                  </>
                ) : null}
              </li>
              {normalizedStatus === 'VALID' ? (
                <li data-testid="delete-entry-sealed-warning">
                  <strong>Entrada sellada (VALID):</strong> esta solicitud ya fue aprobada; al
                  eliminarla se borrará definitivamente su dictamen y resolución.
                </li>
              ) : normalizedStatus === 'INVALID' ? (
                <li>
                  Esta entrada fue dictaminada como <span className={styles.impactMono}>INVALID</span>{' '}
                  y se eliminará junto con su resolución registrada.
                </li>
              ) : null}
              <li>
                {isMasterDetailTable
                  ? 'Se eliminará la entrada completa y todas sus filas/períodos sincronizados en la tabla abierta (.data.json.gz).'
                  : 'Se eliminará la entrada en base de datos y todas sus filas sincronizadas en la tabla abierta (.data.json.gz).'}
              </li>
            </ul>
          </div>
        </div>

        {errorMsg ? (
          <div className={styles.errorBanner} role="alert" data-testid="delete-entry-error">
            {errorMsg}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
};
