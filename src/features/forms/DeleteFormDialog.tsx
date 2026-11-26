import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/useToast';
import { useDeleteFormMutation } from '../../queries/useFormsQueries';
import type { FormDefinition } from '../../types/forms';
import styles from './CreateFormDialog.module.css';

/**
 * Propiedades del diálogo de confirmación de borrado en cascada de un formulario (`DeleteFormDialog`).
 */
export interface DeleteFormDialogProps {
  /** Controla la apertura del diálogo. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
  /** Definición del formulario a eliminar permanentemente. */
  form: FormDefinition;
  /** Callback invocado tras confirmar la eliminación en el servidor. */
  onDeleted?: (deletedId: string) => void;
}

/**
 * Diálogo de confirmación explícita para `DELETE /api/v1/forms/:id`.
 * Advierte con claridad que se eliminarán en cascada el formulario, todas sus entradas
 * registradas y la tabla abierta vinculada junto a su artefacto `.data.json.gz`.
 */
export const DeleteFormDialog: React.FC<DeleteFormDialogProps> = ({
  open,
  onOpenChange,
  form,
  onDeleted,
}) => {
  const { showToast } = useToast();
  const deleteForm = useDeleteFormMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const entriesCount = form._count?.entries ?? form.entriesCount;
  const linkedTableLabel = form.linkedTable?.tableName || form.linkedTable?.shortCode || null;

  const handleConfirmDelete = async () => {
    setErrorMsg(null);
    try {
      const result = await deleteForm.mutateAsync(form.id);
      showToast(`Formulario "${form.title}" eliminado en cascada.`, 'info');
      onOpenChange(false);
      onDeleted?.(result.id || form.id);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo eliminar el formulario.';
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
      title={`Eliminar "${form.title}"`}
      description="Esta acción es irreversible y afecta el almacenamiento físico y lógico del espacio."
      size="sm"
      footer={
        <div className={styles.footerActions}>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleteForm.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={14} />}
            loading={deleteForm.isPending}
            onClick={() => void handleConfirmDelete()}
            data-testid="delete-form-confirm-btn"
          >
            Eliminar formulario
          </Button>
        </div>
      }
    >
      <div className={styles.form}>
        <div className={styles.dangerNotice} role="alert">
          <AlertTriangle size={18} aria-hidden="true" className={styles.dangerIcon} />
          <div>
            <strong>Eliminación permanente en cascada</strong>
            <ul className={styles.impactList}>
              <li>
                El endpoint público <span className={styles.impactMono}>/{form.slug}</span> dejará
                de aceptar envíos de inmediato.
              </li>
              <li>
                Se eliminarán todas las entradas registradas
                {typeof entriesCount === 'number' ? (
                  <>
                    {' '}
                    (<span className={styles.impactMono}>{entriesCount}</span>{' '}
                    {entriesCount === 1 ? 'entrada' : 'entradas'})
                  </>
                ) : null}
                .
              </li>
              <li>
                Se eliminará la tabla abierta vinculada
                {linkedTableLabel ? (
                  <>
                    {' '}
                    (<span className={styles.impactMono}>{linkedTableLabel}</span>)
                  </>
                ) : null}{' '}
                y su archivo físico <span className={styles.impactMono}>.data.json.gz</span>.
              </li>
            </ul>
          </div>
        </div>

        {errorMsg ? (
          <div className={styles.errorBanner} role="alert" data-testid="delete-form-error">
            {errorMsg}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
};
