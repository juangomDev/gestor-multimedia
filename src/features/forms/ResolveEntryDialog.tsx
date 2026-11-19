import React, { useId, useState } from 'react';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/useToast';
import {
  useDispatchFormEntryMutation,
  useResolveFormEntryMutation,
} from '../../queries/useFormsQueries';
import { formatDate } from '../../utils/formatters';
import { formatPayloadValue, isEntryAlreadyResolvedError } from './formHelpers';
import { ResolutionFieldInput } from './ResolutionFieldInput';
import { SealedEntryDetails } from './SealedEntryDetails';
import type {
  FormDefinition,
  FormEntry,
  FormResolutionState,
  FormSchemaField,
} from '../../types/forms';
import styles from './ResolveEntryDialog.module.css';

/**
 * Propiedades del diálogo de resolución Write-Once y reenvío webhook (`ResolveEntryDialog`).
 */
export interface ResolveEntryDialogProps {
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
  /** Definición completa del formulario (`resolutionFieldsSchema`, `allowedResolutionStates`, `externalTargetUrl`). */
  form: FormDefinition;
  /** Entrada seleccionada para dictaminar o auditar/reenviar. */
  entry: FormEntry;
  /** Callback opcional al detectar conflicto `409` para forzar refresco de bandeja. */
  onConflictRefresh?: () => void;
}

function buildInitialResolutionValues(fields: FormSchemaField[]): Record<string, unknown> {
  const initial: Record<string, unknown> = {};
  for (const field of fields) {
    initial[field.name] = field.type === 'boolean' ? false : '';
  }
  return initial;
}

/**
 * Diálogo de dictamen inmutable **Write-Once** (`PATCH /api/v1/forms/entries/:id/resolve`)
 * con renderizado dinámico desde `resolutionFieldsSchema`, manejo explícito de conflicto
 * `409 ENTRY_ALREADY_RESOLVED` y despacho webhook bajo demanda (`POST /api/v1/forms/entries/:id/dispatch`).
 */
export const ResolveEntryDialog: React.FC<ResolveEntryDialogProps> = ({
  open,
  onOpenChange,
  form,
  entry,
  onConflictRefresh,
}) => {
  const formHtmlId = useId();
  const { showToast } = useToast();
  const resolveMutation = useResolveFormEntryMutation(form.id);
  const dispatchMutation = useDispatchFormEntryMutation(form.id);

  const states =
    form.allowedResolutionStates.length > 0 ? form.allowedResolutionStates : ['VALID', 'INVALID'];
  const [trackedEntryId, setTrackedEntryId] = useState(entry.id);
  const [status, setStatus] = useState<string>(states[0] || 'VALID');
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    buildInitialResolutionValues(form.resolutionFieldsSchema)
  );
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (entry.id !== trackedEntryId) {
    setTrackedEntryId(entry.id);
    setStatus(states[0] || 'VALID');
    setValues(buildInitialResolutionValues(form.resolutionFieldsSchema));
    setConflictMsg(null);
    setErrorMsg(null);
  }

  const isSealed = entry.status !== 'NEW';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictMsg(null);
    setErrorMsg(null);

    const payload: Record<string, unknown> = {};
    for (const field of form.resolutionFieldsSchema) {
      const raw = values[field.name];
      if (field.required && field.type !== 'boolean' && String(raw ?? '').trim() === '') {
        setErrorMsg(`El campo "${field.label}" es obligatorio para sellar el dictamen.`);
        return;
      }
      if (field.type === 'number') {
        payload[field.name] = raw === '' ? null : Number(raw);
      } else if (field.type === 'boolean') {
        payload[field.name] = Boolean(raw);
      } else {
        payload[field.name] = raw;
      }
    }

    try {
      await resolveMutation.mutateAsync({
        entryId: entry.id,
        input: { status: status as FormResolutionState, resolutionPayload: payload },
      });
      showToast('Dictamen sellado de forma inmutable (Write-Once).', 'success');
      onOpenChange(false);
    } catch (err: unknown) {
      if (isEntryAlreadyResolvedError(err)) {
        setConflictMsg(
          'Esta entrada ya fue sellada previamente (409 ENTRY_ALREADY_RESOLVED). El dictamen write-once no puede sobrescribirse.'
        );
        onConflictRefresh?.();
        return;
      }
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo sellar el dictamen.';
      setErrorMsg(detail || fallback);
    }
  };

  const handleDispatch = async () => {
    try {
      const result = await dispatchMutation.mutateAsync(entry.id);
      showToast(`Webhook enviado correctamente hacia ${result.targetUrl}.`, 'success');
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'Error al despachar el webhook externo.', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isSealed ? 'Detalle de entrada sellada' : 'Dictaminar entrada (Write-Once)'}
      description={`Registrada el ${formatDate(entry.createdAt)}`}
      size="lg"
      footer={
        <div className={styles.footerActions}>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {!isSealed && !conflictMsg ? (
            <Button
              type="submit"
              form={formHtmlId}
              variant="primary"
              icon={<Lock size={14} />}
              loading={resolveMutation.isPending}
              data-testid="resolve-entry-submit-btn"
            >
              Sellar dictamen
            </Button>
          ) : null}
        </div>
      }
    >
      <div className={styles.wrap} data-testid="resolve-entry-dialog">
        <section className={styles.summaryCard}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionTitle}>Datos recibidos</span>
            <Badge
              tone={entry.status === 'VALID' ? 'ok' : entry.status === 'INVALID' ? 'danger' : 'warn'}
              mono
            >
              {entry.status}
            </Badge>
          </div>
          <dl className={styles.kvGrid}>
            {Object.entries(entry.entryPayload).map(([key, val]) => (
              <div key={key} className={styles.kvItem}>
                <dt className={styles.kvKey}>{key}</dt>
                <dd className={styles.kvVal}>{formatPayloadValue(val)}</dd>
              </div>
            ))}
          </dl>
        </section>

        {isSealed ? (
          <SealedEntryDetails
            form={form}
            entry={entry}
            isDispatching={dispatchMutation.isPending}
            onDispatch={() => void handleDispatch()}
          />
        ) : (
          <>
            <div className={styles.writeOnceNotice} role="note">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>
                <strong>Dictamen Write-Once:</strong> una vez sellada la resolución, no podrá
                editarse ni revertirse.
              </span>
            </div>

            {conflictMsg ? (
              <div className={styles.conflictBanner} role="alert" data-testid="entry-conflict-409">
                <ShieldAlert size={16} aria-hidden="true" />
                <span>{conflictMsg}</span>
              </div>
            ) : null}

            {errorMsg ? (
              <div className={styles.conflictBanner} role="alert">
                {errorMsg}
              </div>
            ) : null}

            <form id={formHtmlId} className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
              <div className={styles.fieldGroup}>
                <span className={styles.label}>Estado de dictamen</span>
                <div className={styles.stateButtons} role="radiogroup" aria-label="Estado de dictamen">
                  {states.map((st) => {
                    const selected = status === st;
                    const activeClass =
                      selected && st === 'INVALID'
                        ? styles.stateBtnInvalid
                        : selected
                        ? styles.stateBtnValid
                        : '';
                    return (
                      <button
                        key={st}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`${styles.stateBtn} ${activeClass}`}
                        onClick={() => setStatus(st)}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.resolutionFieldsSchema.map((field) => (
                <ResolutionFieldInput
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  onChange={(nextVal) =>
                    setValues((prev) => ({ ...prev, [field.name]: nextVal }))
                  }
                />
              ))}
            </form>
          </>
        )}
      </div>
    </Dialog>
  );
};
