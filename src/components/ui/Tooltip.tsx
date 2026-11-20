import React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import styles from './Tooltip.module.css';

/** Proveedor global de tooltips (`delayDuration` rápido por defecto). */
export const TooltipProvider = RadixTooltip.Provider;

/**
 * Propiedades del tooltip editorial compacto (`Tooltip`).
 */
export interface UiTooltipProps {
  /** Texto o nodo mostrado en el globo informativo */
  content: React.ReactNode;
  /** Elemento interactivo disparador (debe aceptar `ref`) */
  children: React.ReactNode;
  /** Posición preferida respecto al disparador */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Desplazamiento en píxeles */
  sideOffset?: number;
}

/**
 * Tooltip accesible sobre `@radix-ui/react-tooltip` con alto contraste editorial
 * e instanciación origin-aware.
 */
export const Tooltip: React.FC<UiTooltipProps> = ({
  content,
  children,
  side = 'top',
  sideOffset = 6,
}) => {
  if (!content) return <>{children}</>;

  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content side={side} sideOffset={sideOffset} className={styles.content}>
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
};
