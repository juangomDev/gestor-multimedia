import React, { useId, useState } from 'react';
import { ClipboardPlus, Plus, X } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/useToast';
import { useCreateFormMutation } from '../../queries/useFormsQueries';
import {
  FormSchemaFieldEditor,
  type EditableSchemaField,
} from './FormSchemaFieldEditor';
import { slugifyTitle, validateFormSchemaFields } from './formHelpers';
import type { FormDefinition, FormSchemaField } from '../../types/forms';
import styles from './CreateFormDialog.module.css';

/**
 * Propiedades del diálogo de creación de formularios dinámicos (`CreateFormDialog`).
 */
export interface CreateFormDialogProps {
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback al cerrar el diálogo. */
  onOpenChange: (open: boolean) => void;
  /** UUID de la carpeta de tipo `TABLE` donde se creará y vinculará el formulario. */
  folderId: string;
  /** Nombre legible de la carpeta `TABLE` para contexto visual. */
  folderName: string;
  /** Callback opcional invocado con el formulario recién creado. */
  onCreated?: (form: FormDefinition) => void;
}

const DEFAULT_ENTRY_FIELDS: EditableSchemaField[] = [
  { _uid: 'e-1', name: 'nombre', label: 'Nombre completo', type: 'string', required: true },
  { _uid: 'e-2', name: 'correo', label: 'Correo electrónico', type: 'email', required: true },
];

const DEFAULT_RESOLUTION_FIELDS: EditableSchemaField[] = [
  { _uid: 'r-1', name: 'observacion', label: 'Observación de dictamen', type: 'textarea', required: true },
];

function sanitizeFields(fields: EditableSchemaField[]): FormSchemaField[] {
  return fields
    .filter((f) => f.name.trim() && f.label.trim())
    .map(({ _uid: _ignoredUid, optionsDraft: _ignoredDraft, ...rest }) => ({
      ...rest,
      name: rest.name.trim(),
      label: rest.label.trim(),
      ...(rest.type === 'select' ? { options: rest.options ?? [] } : { options: undefined }),
    }));
}

/**
 * Diálogo visual de creación de Formularios Dinámicos accesible exclusivamente desde carpetas `TABLE`
 * con permiso `EDIT`/`ADMIN`. Permite definir `entryFieldsSchema`, `resolutionFieldsSchema`,
 * `allowedResolutionStates` y webhook `externalTargetUrl`.
 */
export const CreateFormDialog: React.FC<CreateFormDialogProps> = ({
  open,
  onOpenChange,
  folderId,
  folderName,
  onCreated,
}) => {
  const formId = useId();
  const descId = useId();
  const { showToast } = useToast();
  const createForm = useCreateFormMutation();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [externalTargetUrl, setExternalTargetUrl] = useState('');
  const [entryFields, setEntryFields] = useState<EditableSchemaField[]>(DEFAULT_ENTRY_FIELDS);
  const [resolutionFields, setResolutionFields] =
    useState<EditableSchemaField[]>(DEFAULT_RESOLUTION_FIELDS);
  const [allowedStates, setAllowedStates] = useState<string[]>(['VALID', 'INVALID']);
  const [stateInput, setStateInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setSlugEdited(false);
    setDescription('');
    setExternalTargetUrl('');
    setEntryFields(DEFAULT_ENTRY_FIELDS);
    setResolutionFields(DEFAULT_RESOLUTION_FIELDS);
    setAllowedStates(['VALID', 'INVALID']);
    setStateInput('');
    setErrorMsg(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleAddState = () => {
    const clean = stateInput.trim().toUpperCase();
    if (!clean) return;
    if (!allowedStates.includes(clean)) setAllowedStates((prev) => [...prev, clean]);
    setStateInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanSlug = slugifyTitle(slug || cleanTitle);
    const cleanEntryFields = sanitizeFields(entryFields);
    const cleanResolutionFields = sanitizeFields(resolutionFields);

    if (!cleanTitle) {
      setErrorMsg('Introduce un título para el formulario.');
      return;
    }
    if (!cleanSlug) {
      setErrorMsg('Introduce un slug válido (solo minúsculas, números y guiones).');
      return;
    }
    if (cleanEntryFields.length === 0) {
      setErrorMsg('Define al menos un campo de entrada con etiqueta y clave JSON.');
      return;
    }
    const schemaError = validateFormSchemaFields(cleanEntryFields, cleanResolutionFields);
    if (schemaError) {
      setErrorMsg(schemaError);
      return;
    }
    if (allowedStates.length === 0) {
      setErrorMsg('Debe existir al menos un estado permitido para el dictamen.');
      return;
    }

    setErrorMsg(null);
    try {
      const created = await createForm.mutateAsync({
        title: cleanTitle,
        slug: cleanSlug,
        description: description.trim() || undefined,
        folderId,
        entryFieldsSchema: cleanEntryFields,
        resolutionFieldsSchema: cleanResolutionFields,
        allowedResolutionStates: allowedStates,
        externalTargetUrl: externalTargetUrl.trim() || undefined,
      });

      showToast(`Formulario "${created.title}" creado en ${folderName}.`, 'success');
      onCreated?.(created);
      handleClose(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo crear el formulario.';
      setErrorMsg(detail || fallback);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Nuevo formulario dinámico"
      description={`Se vinculará a la carpeta de tablas "${folderName}" para ingesta pública y dictamen write-once.`}
      size="xl"
      footer={
        <div className={styles.footerActions}>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={createForm.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            icon={<ClipboardPlus size={14} />}
            loading={createForm.isPending}
            data-testid="create-form-submit-btn"
          >
            Crear formulario
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.twoCol}>
          <Input
            label="Título del formulario"
            value={title}
            onChange={(e) => {
              const val = e.target.value;
              setTitle(val);
              if (!slugEdited) setSlug(slugifyTitle(val));
            }}
            placeholder="Ej. Registro de Proveedores 2026"
            required
          />
          <Input
            label="Slug público (/api/v1/public/forms/:slug/entries)"
            value={slug}
            mono
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value);
            }}
            placeholder="registro-proveedores-2026"
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={descId} className={styles.label}>
            Descripción operativa (opcional)
          </label>
          <textarea
            id={descId}
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explica qué captura este formulario y criterios de dictamen..."
          />
        </div>

        <FormSchemaFieldEditor
          title="Campos de entrada pública"
          fields={entryFields}
          onChange={setEntryFields}
          addLabel="Añadir campo"
          emptyMessage="Añade al menos un campo para recibir envíos públicos."
          testId="entry-fields-editor"
        />

        <FormSchemaFieldEditor
          title="Campos de dictamen interno"
          fields={resolutionFields}
          onChange={setResolutionFields}
          addLabel="Añadir campo"
          emptyMessage="Opcional: campos que completará el operador al sellar una entrada."
          testId="resolution-fields-editor"
        />

        <div className={styles.twoCol}>
          <div className={styles.fieldGroup}>
            <span className={styles.label}>Estados permitidos</span>
            <div className={styles.statesRow}>
              {allowedStates.map((st) => (
                <span key={st} className={styles.stateChip}>
                  {st}
                  <button
                    type="button"
                    className={styles.chipRemoveBtn}
                    aria-label={`Quitar estado ${st}`}
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
              />
              <Button type="button" variant="ghost" size="sm" icon={<Plus size={12} />} onClick={handleAddState}>
                Añadir
              </Button>
            </div>
          </div>

          <Input
            label="Webhook externo al sellar (opcional)"
            type="url"
            mono
            value={externalTargetUrl}
            onChange={(e) => setExternalTargetUrl(e.target.value)}
            placeholder="https://erp.ejemplo.com/webhooks/forms"
          />
        </div>

        {errorMsg ? (
          <div className={styles.errorBanner} role="alert">
            {errorMsg}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
};
