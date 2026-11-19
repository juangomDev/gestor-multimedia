import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { fieldKeyFromLabel } from './formHelpers';
import type { FormSchemaField, FormSchemaFieldType } from '../../types/forms';
import styles from './CreateFormDialog.module.css';

/**
 * Registro editable interno para filas del constructor visual de esquemas de formulario.
 */
export interface EditableSchemaField extends FormSchemaField {
  _uid: string;
  optionsDraft?: string;
}

/**
 * Propiedades del constructor visual de campos (`FormSchemaFieldEditor`).
 */
export interface FormSchemaFieldEditorProps {
  /** Encabezado de la sección (`entryFieldsSchema` o `resolutionFieldsSchema`). */
  title: string;
  /** Lista controlada de campos editables. */
  fields: EditableSchemaField[];
  /** Callback al mutar la lista de campos. */
  onChange: (next: EditableSchemaField[]) => void;
  /** Etiqueta del botón de alta. */
  addLabel: string;
  /** Texto mostrado cuando aún no existen campos en esta sección. */
  emptyMessage: string;
  /** Identificador de prueba opcional para la sección. */
  testId?: string;
}

const FIELD_TYPES: Array<{ value: FormSchemaFieldType; label: string }> = [
  { value: 'string', label: 'Texto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Sí / No' },
  { value: 'select', label: 'Selector' },
];

/**
 * Subcomponente constructor de listas `FormSchemaField[]` utilizado tanto para
 * `entryFieldsSchema` como para `resolutionFieldsSchema` en `CreateFormDialog`.
 */
export const FormSchemaFieldEditor: React.FC<FormSchemaFieldEditorProps> = ({
  title,
  fields,
  onChange,
  addLabel,
  emptyMessage,
  testId,
}) => {
  const handleAdd = () => {
    onChange([
      ...fields,
      {
        _uid: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        label: '',
        type: 'string',
        required: true,
        optionsDraft: '',
      },
    ]);
  };

  const updateField = (uid: string, patch: Partial<EditableSchemaField>) => {
    onChange(fields.map((item) => (item._uid === uid ? { ...item, ...patch } : item)));
  };

  return (
    <section className={styles.schemaSection} data-testid={testId}>
      <div className={styles.schemaHeader}>
        <span className={styles.schemaTitle}>{title}</span>
        <Button type="button" variant="secondary" size="sm" icon={<Plus size={13} />} onClick={handleAdd}>
          {addLabel}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className={styles.emptySchema}>{emptyMessage}</p>
      ) : (
        <div className={styles.schemaList}>
          {fields.map((field, index) => (
            <div key={field._uid} className={styles.schemaRow}>
              <div className={styles.schemaRowGrid}>
                <input
                  type="text"
                  className={styles.compactInput}
                  value={field.label}
                  onChange={(e) => {
                    const nextLabel = e.target.value;
                    const expectedAuto = fieldKeyFromLabel(field.label);
                    const shouldSyncName = !field.name || field.name === expectedAuto;
                    updateField(field._uid, {
                      label: nextLabel,
                      ...(shouldSyncName ? { name: fieldKeyFromLabel(nextLabel) } : {}),
                    });
                  }}
                  placeholder={`Etiqueta del campo ${index + 1}`}
                  aria-label={`Etiqueta ${title} ${index + 1}`}
                />

                <input
                  type="text"
                  className={`${styles.compactInput} ${styles.compactInputMono}`}
                  value={field.name}
                  onChange={(e) => updateField(field._uid, { name: e.target.value })}
                  placeholder="clave_json"
                  aria-label={`Clave JSON ${title} ${index + 1}`}
                />

                <select
                  className={styles.compactSelect}
                  value={field.type}
                  onChange={(e) =>
                    updateField(field._uid, { type: e.target.value as FormSchemaFieldType })
                  }
                  aria-label={`Tipo ${title} ${index + 1}`}
                >
                  {FIELD_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <label className={styles.reqToggle}>
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    onChange={(e) => updateField(field._uid, { required: e.target.checked })}
                  />
                  Oblig.
                </label>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={13} />}
                  aria-label={`Eliminar campo ${field.label || index + 1}`}
                  onClick={() => onChange(fields.filter((item) => item._uid !== field._uid))}
                />
              </div>

              {field.type === 'select' ? (
                <input
                  type="text"
                  className={styles.compactInput}
                  value={field.optionsDraft ?? (field.options?.join(', ') || '')}
                  onChange={(e) => {
                    const raw = e.target.value;
                    updateField(field._uid, {
                      optionsDraft: raw,
                      options: raw
                        .split(',')
                        .map((o) => o.trim())
                        .filter(Boolean),
                    });
                  }}
                  placeholder="Opciones separadas por coma (ej. Alta, Media, Baja)"
                  aria-label={`Opciones selector ${field.label || index + 1}`}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
