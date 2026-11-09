/**
 * Fila individual para configurar un campo dinámico de formulario.
 * @module components/forms/FormFieldRow
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { FormSchemaField, FormSchemaFieldType } from '../../types/forms';
import styles from './CreateFormModal.module.css';

/**
 * Propiedades del componente FormFieldRow.
 */
export interface FormFieldRowProps {
  field: FormSchemaField;
  index: number;
  onUpdate: (index: number, updates: Partial<FormSchemaField>) => void;
  onRemove: (index: number) => void;
}

const FIELD_TYPES: Array<{ value: FormSchemaFieldType; label: string }> = [
  { value: 'string', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Casilla (Sí/No)' },
];

/**
 * Renderiza los controles de edición para un campo del esquema.
 */
export const FormFieldRow: React.FC<FormFieldRowProps> = ({
  field,
  index,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className={styles.fieldItem}>
      <input
        className={styles.input}
        placeholder="Etiqueta visible"
        value={field.label}
        onChange={(e) => onUpdate(index, { label: e.target.value })}
      />
      <input
        className={styles.input}
        placeholder="Clave JSON"
        value={field.name}
        onChange={(e) => onUpdate(index, { name: e.target.value })}
      />
      <select
        className={styles.select}
        value={field.type}
        onChange={(e) => onUpdate(index, { type: e.target.value as FormSchemaFieldType })}
      >
        {FIELD_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={!!field.required}
          onChange={(e) => onUpdate(index, { required: e.target.checked })}
        />
        Oblig.
      </label>
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={() => onRemove(index)}
        title="Eliminar campo"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

