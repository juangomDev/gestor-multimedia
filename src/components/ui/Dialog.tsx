import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import styles from './Dialog.module.css';

/**
 * Tamaños horizontales predefinidos para diálogos modales.
 */
export type UiDialogSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Propiedades del diálogo modal accesible (`Dialog`) construido sobre Radix Dialog.
 */
export interface UiDialogProps {
  /** Controla la apertura del diálogo */
  open: boolean;
  /** Callback invocado cuando cambia el estado de apertura (`Escape`, clic fuera, cierre) */
  onOpenChange: (open: boolean) => void;
  /** Título accesible obligatorio para lectores de pantalla y cabecera */
  title: string;
  /** Subtítulo descriptivo opcional bajo el título */
  description?: string;
  /** Ancho máximo del diálogo */
  size?: UiDialogSize;
  /** Contenido principal del cuerpo del diálogo */
  children: React.ReactNode;
  /** Pie opcional con botones de acción */
  footer?: React.ReactNode;
  /** Clase CSS adicional para el contenedor del diálogo */
  contentClassName?: string;
}

/**
 * Modal accesible con trampa de foco, retorno automático de foco, cierre con `Escape`
 * y elevación editorial construida sobre `@radix-ui/react-dialog`.
 */
export const Dialog: React.FC<UiDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  footer,
  contentClassName,
}) => {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content
          className={`${styles.content} ${styles[size]} ${contentClassName ?? ''}`}
          {...(!description ? { 'aria-describedby': undefined } : {})}
        >
          <div className={styles.header}>
            <div className={styles.headingGroup}>
              <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className={styles.description}>
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close className={styles.closeBtn} aria-label="Cerrar diálogo">
              <X size={16} />
            </RadixDialog.Close>
          </div>

          <div className={styles.body}>{children}</div>

          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
