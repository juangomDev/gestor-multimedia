import React, { useId, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/useToast';
import { useFormDetailQuery, useUpdateFormMutation } from '../../queries/useFormsQueries';
import type { FormDefinition } from '../../types/forms';
import styles from './CreateFormDialog.module.css';

/**
 * Propiedades del diálogo de edición de configuración de formulario (`EditFormDialog`).
 */
export interface EditFormDialogProps {
  /** Controla si el diálogo está visible. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
  /** Definición actual (resumen o detalle) del formulario a configurar. */
  form: FormDefinition;
  /**
   * Si es `true` (p. ej. al abrir desde el listado del Explorador), hidrata el detalle completo
   * vía `GET /api/v1/forms/:id` para leer `allowedResolutionStates`, `autoResolveWithAi` y webhook.
   */
  hydrateDetail?: boolean;
  /** Callback opcional invocado con la definición actualizada tras guardar. */
  onSaved?: (updated: FormDefinition) => void;
}

/**
 * Diálogo editorial para actualizar la configuración mutable de un formulario dinámico
 * (`PATCH /api/v1/forms/:id`): título, estados de dictamen permitidos, bandera de resolución
 * asistida por IA (`autoResolveWithAi`) y webhook externo (`externalTargetUrl`).
 */
export const EditFormDialog: React.FC<EditFormDialogProps> = ({
  open,
  onOpenChange,
  form,
  hydrateDetail = false,
  onSaved,
}) => {
  const formHtmlId = useId();
  const aiSwitchId = useId();
  const { showToast } = useToast();
  const updateForm = useUpdateFormMutation();
  const detailQuery = useFormDetailQuery(open && hydrateDetail ? form.id : null);

  const source = detailQuery.data ?? form;
  const initialStates =
    Array.isArray(source.allowedResolutionStates) && source.allowedResolutionStates.length > 0
      ? source.allowedResolutionStates
      : ['VALID', 'INVALID'];

  const snapshotKey = [
    open,
    source.id,
    source.title,
    source.externalTargetUrl ?? '',
    Boolean(source.autoResolveWithAi),
    initialStates.join('|'),
    detailQuery.dataUpdatedAt,
  ].join(':');

  const [trackedKey, setTrackedKey] = useState(snapshotKey);
  const [title, setTitle] = useState(source.title);
  const [allowedStates, setAllowedStates] = useState<string[]>(initialStates);
  const [stateInput, setStateInput] = useState('');
  const [autoResolveWithAi, setAutoResolveWithAi] = useState(Boolean(source.autoResolveWithAi));
  const [externalTargetUrl, setExternalTargetUrl] = useState(source.externalTargetUrl ?? '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (snapshotKey !== trackedKey) {
    setTrackedKey(snapshotKey);
    setTitle(source.title);
    setAllowedStates(initialStates);
    setStateInput('');
    setAutoResolveWithAi(Boolean(source.autoResolveWithAi));
    setExternalTargetUrl(source.externalTargetUrl ?? '');
    setErrorMsg(null);
  }

  const isHydrating = hydrateDetail && detailQuery.isLoading && !detailQuery.data;

  const handleAddState = () => {
    const clean = stateInput.trim().toUpperCase();
    if (!clean) return;
    if (!allowedStates.includes(clean)) {
      setAllowedStates((prev) => [...prev, clean]);
    }
    setStateInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHydrating) return;

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg('El título del formulario no puede estar vacío.');
      return;
    }
    if (allowedStates.length === 0) {
      setErrorMsg('Debe existir al menos un estado permitido para el dictamen.');
      return;
    }

    const cleanWebhook = externalTargetUrl.trim();
    if (cleanWebhook) {
      try {
        const parsed = new URL(cleanWebhook);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setErrorMsg('La URL del webhook debe iniciar con http:// o https://.');
          return;
        }
      } catch {
        setErrorMsg('Introduce una URL de webhook válida (o déjala vacía para desactivarla).');
        return;
      }
    }

    setErrorMsg(null);
    try {
      const updated = await updateForm.mutateAsync({
        formId: form.id,
        input: {
          title: cleanTitle,
          allowedResolutionStates: allowedStates,
          autoResolveWithAi,
          externalTargetUrl: cleanWebhook || null,
        },
      });
      showToast(`Configuración de "${updated.title || cleanTitle}" guardada.`, 'success');
      onSaved?.(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo actualizar el formulario.';
      setErrorMsg(detail || fallback);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Configurar "${form.title}"`}
      description={`Slug público inmutable: /${form.slug} · Ajusta título, estados permitidos, IA y webhook.`}
      size="md"
      footer={
        <div className={styles.footerActions}>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={updateForm.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formHtmlId}
            variant="primary"
            icon={<Save size={14} />}
            loading={updateForm.isPending}
            disabled={isHydrating}
            data-testid="edit-form-submit-btn"
          >
            Guardar cambios
          </Button>
        </div>
      }
    >
      {isHydrating ? (
        <div className={styles.form}>
          <Skeleton variant="line" height={38} />
          <Skeleton variant="line" height={54} />
          <Skeleton variant="line" height={38} />
        </div>
      ) : (
        <form id={formHtmlId} className={styles.form} onSubmit={(e) => void handleSubmit(e)} noValidate>
          <Input
            label="Título del formulario"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            disabled={updateForm.isPending}
            required
          />

          <div className={styles.fieldGroup}>
            <span className={styles.label}>Estados permitidos de dictamen</span>
            <div className={styles.statesRow}>
              {allowedStates.map((st) => (
                <span key={st} className={styles.stateChip}>
                  {st}
                  <button
                    type="button"
                    className={styles.chipRemoveBtn}
                    aria-label={`Quitar estado ${st}`}
                    disabled={updateForm.isPending}
                    onClick={() => setAllowedStates((prev) => prev.filter((item) => item !== st))}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                className={`${styles.compactInput} ${styles.compactInputMono}`}
                value={stateInput}
                onChange={(e) => setStateInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddState();
                  }
                }}
                placeholder="Añadir estado..."
                aria-label="Nuevo estado permitido"
                disabled={updateForm.isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Plus size={12} />}
                onClick={handleAddState}
                disabled={updateForm.isPending}
              >
                Añadir
              </Button>
            </div>
          </div>

          <div className={styles.switchRow}>
            <label htmlFor={aiSwitchId} className={styles.switchText}>
              <span className={styles.switchTitle}>Resolución asistida por IA</span>
              <span className={styles.switchSub}>
                Habilita evaluación automática al recibir nuevas entradas (`autoResolveWithAi`).
              </span>
            </label>
            <Switch
              id={aiSwitchId}
              checked={autoResolveWithAi}
              onCheckedChange={setAutoResolveWithAi}
              disabled={updateForm.isPending}
              ariaLabel="Activar o desactivar resolución asistida por IA"
            />
          </div>

          <div className={styles.fieldGroup}>
            <Input
              label="Webhook externo al sellar (opcional)"
              type="url"
              mono
              value={externalTargetUrl}
              onChange={(e) => {
                setExternalTargetUrl(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="https://erp.ejemplo.com/webhooks/forms"
              disabled={updateForm.isPending}
            />
            <span className={styles.fieldHint}>
              Deja este campo vacío para desactivar el envío de webhooks externos.
            </span>
          </div>

          {errorMsg ? (
            <div className={styles.errorBanner} role="alert" data-testid="edit-form-error">
              {errorMsg}
            </div>
          ) : null}
        </form>
      )}
    </Dialog>
  );
};
