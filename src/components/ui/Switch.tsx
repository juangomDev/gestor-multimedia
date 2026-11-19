import React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import styles from './Switch.module.css';

/**
 * Propiedades del interruptor booleano accesible (`Switch`).
 */
export interface UiSwitchProps {
  /** Estado activo/inactivo controlado */
  checked: boolean;
  /** Callback al alternar el interruptor */
  onCheckedChange: (checked: boolean) => void;
  /** Deshabilita interacción */
  disabled?: boolean;
  /** Etiqueta accesible (`aria-label`) */
  ariaLabel?: string;
  /** ID HTML para asociar con `<label htmlFor>` */
  id?: string;
  /** Clase CSS opcional */
  className?: string;
}

/**
 * Interruptor accesible sobre `@radix-ui/react-switch` con área táctil ampliada
 * y transición GPU únicamente sobre `transform`.
 */
export const Switch: React.FC<UiSwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  ariaLabel,
  id,
  className,
}) => (
  <RadixSwitch.Root
    id={id}
    checked={checked}
    onCheckedChange={onCheckedChange}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`${styles.root} ${className ?? ''}`}
  >
    <RadixSwitch.Thumb className={styles.thumb} />
  </RadixSwitch.Root>
);
