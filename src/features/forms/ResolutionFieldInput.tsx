import React from 'react';
import { Input } from '../../components/ui/Input';
import { Switch } from '../../components/ui/Switch';
import type { FormSchemaField } from '../../types/forms';
import styles from './ResolveEntryDialog.module.css';

/**
 * Propiedades del control dinámico de un campo de resolución (`ResolutionFieldInput`).
 */
export interface ResolutionFieldInputProps {
  field: FormSchemaField;
  value: unknown;
  onChange: (nextValue: unknown) => void;
}

/**
 * Renderiza el control accesible adecuado (`Input`, `Switch`, `<select>`, `<textarea>`)
 * para un campo de `resolutionFieldsSchema` dentro de `ResolveEntryDialog`.
 */
export const ResolutionFieldInput: React.FC<ResolutionFieldInputProps> = ({
  field,
  value,
  onChange,
}) => {
  if (field.type === 'boolean') {
    return (
      <div className={styles.switchField}>
        <span className={styles.label}>{field.label}</span>
        <Switch checked={Boolean(value)} onCheckedChange={onChange} ariaLabel={field.label} />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className={styles.fieldGroup}>
        <label htmlFor={`res-${field.name}`} className={styles.label}>
          {field.label}
          {field.required ? ' *' : ''}
        </label>
        <textarea
          id={`res-${field.name}`}
          className={styles.textarea}
          value={String(value ?? '')}
          required={field.required}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className={styles.fieldGroup}>
        <label htmlFor={`res-${field.name}`} className={styles.label}>
          {field.label}
          {field.required ? ' *' : ''}
        </label>
        <select
          id={`res-${field.name}`}
          className={styles.select}
          value={String(value ?? '')}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecciona una opción...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const inputType =
    field.type === 'number'
      ? 'number'
      : field.type === 'date'
      ? 'date'
      : field.type === 'email'
      ? 'email'
      : 'text';

  return (
    <Input
      label={`${field.label}${field.required ? ' *' : ''}`}
      type={inputType}
      value={String(value ?? '')}
      required={field.required}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};
