import React, { useId } from 'react';
import styles from './Input.module.css';

/**
 * Propiedades del campo de entrada editorial empotrado (`Input`).
 */
export interface UiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Etiqueta visible asociada al campo */
  label?: string;
  /** Texto auxiliar discreto bajo el campo */
  hint?: string;
  /** Mensaje de validación de error (activa `aria-invalid`) */
  error?: string | null;
  /** Icono opcional a la izquierda dentro del control */
  leadingIcon?: React.ReactNode;
  /** Elemento opcional a la derecha (ej. botón limpiar o atajo `⌘K`) */
  trailingElement?: React.ReactNode;
  /** Usa fuente monoespaciada (`IBM Plex Mono`) para códigos o URLs */
  mono?: boolean;
  /** Referencia opcional al `<input>` nativo */
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Campo de entrada sobre superficie `--control-bg` (empotrada) con asociación ARIA automática
 * de etiqueta, ayuda y error de validación.
 */
export const Input: React.FC<UiInputProps> = ({
  id,
  label,
  hint,
  error,
  leadingIcon,
  trailingElement,
  mono = false,
  disabled,
  className,
  ref,
  ...rest
}) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  const feedbackId = error || hint ? `${inputId}-feedback` : undefined;

  const wrapClasses = [
    styles.controlWrap,
    error ? styles.invalid : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  const inputClasses = [
    styles.input,
    leadingIcon ? styles.hasLeading : '',
    mono ? styles.mono : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      {label ? (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      ) : null}

      <div className={wrapClasses}>
        {leadingIcon ? (
          <span className={styles.leadingIcon} aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={inputClasses}
          aria-invalid={error ? true : undefined}
          aria-describedby={feedbackId}
          {...rest}
        />
        {trailingElement ? <span className={styles.trailing}>{trailingElement}</span> : null}
      </div>

      {error ? (
        <span id={feedbackId} role="alert" className={styles.error}>
          {error}
        </span>
      ) : hint ? (
        <span id={feedbackId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
};
