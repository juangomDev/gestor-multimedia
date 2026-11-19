import React from 'react';
import * as RadixPopover from '@radix-ui/react-popover';
import styles from './Popover.module.css';

/** Raíz del popover accesible (`@radix-ui/react-popover`). */
export const Popover = RadixPopover.Root;

/** Disparador del popover. */
export const PopoverTrigger = RadixPopover.Trigger;

/** Botón de cierre interno del popover. */
export const PopoverClose = RadixPopover.Close;

/**
 * Propiedades del panel flotante `PopoverContent`.
 */
export interface UiPopoverContentProps extends RadixPopover.PopoverContentProps {
  /** Alineación respecto al disparador */
  align?: 'start' | 'center' | 'end';
  /** Separación vertical respecto al disparador */
  sideOffset?: number;
}

/**
 * Contenedor elevado para bandejas y paneles contextuales (notificaciones, ajustes de servidor, etc.).
 */
export const PopoverContent: React.FC<UiPopoverContentProps> = ({
  align = 'end',
  sideOffset = 8,
  className,
  children,
  ...rest
}) => (
  <RadixPopover.Portal>
    <RadixPopover.Content
      align={align}
      sideOffset={sideOffset}
      className={`${styles.content} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </RadixPopover.Content>
  </RadixPopover.Portal>
);
