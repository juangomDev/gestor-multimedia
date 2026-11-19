import React from 'react';
import styles from './Button.module.css';

/**
 * Variantes visuales disponibles para el botón editorial.
 */
export type UiButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Escala de tamaños del botón editorial.
 */
export type UiButtonSize = 'sm' | 'md' | 'icon';

/**
 * Propiedades del botón editorial reutilizable (`Button`).
 */
export interface UiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Estilo semántico del botón */
  variant?: UiButtonVariant;
  /** Tamaño visual (con hit-area accesible >= 40px) */
  size?: UiButtonSize;
  /** Icono opcional a la izquierda del texto */
  icon?: React.ReactNode;
  /** Icono opcional a la derecha del texto */
  iconRight?: React.ReactNode;
  /** Muestra indicador de carga y deshabilita interacciones */
  loading?: boolean;
  /** Expande el botón al 100% del ancho contenedor */
  fullWidth?: boolean;
  /** Referencia opcional al elemento `<button>` nativo */
  ref?: React.Ref<HTMLButtonElement>;
}

/**
 * Botón nativo accesible del sistema "Archivo Editorial" con feedback táctil (`scale(0.97)`),
 * alineación óptica para iconos y variantes ligadas a tokens semánticos Claro/Oscuro.
 */
export const Button: React.FC<UiButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  disabled,
  type = 'button',
  className,
  children,
  ref,
  ...rest
}) => {
  const hasLeadingIcon = Boolean(icon || loading) && size !== 'icon';
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    hasLeadingIcon ? styles.hasIconLeft : '',
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : icon ? (
        <span className={styles.iconSlot} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
      {!loading && iconRight ? (
        <span className={styles.iconSlot} aria-hidden="true">
          {iconRight}
        </span>
      ) : null}
    </button>
  );
};
