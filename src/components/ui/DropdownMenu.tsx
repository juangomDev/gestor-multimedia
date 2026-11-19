import React from 'react';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import styles from './DropdownMenu.module.css';

/**
 * Raíz del menú desplegable contextual accesible (`@radix-ui/react-dropdown-menu`).
 * Usa `modal={false}` por defecto para permitir abrir diálogos modales desde `onSelect`
 * sin conflictos de foco (`aria-hidden`) ni bloqueos de `pointer-events` en `<body>`.
 */
export const DropdownMenu: React.FC<RadixDropdown.DropdownMenuProps> = ({
  modal = false,
  ...rest
}) => <RadixDropdown.Root modal={modal} {...rest} />;

/** Elemento disparador del menú contextual. */
export const DropdownMenuTrigger = RadixDropdown.Trigger;

/**
 * Propiedades del contenedor flotante del menú desplegable (`DropdownMenuContent`).
 */
export interface UiDropdownContentProps extends RadixDropdown.DropdownMenuContentProps {
  /** Alineación horizontal respecto al disparador */
  align?: 'start' | 'center' | 'end';
  /** Desplazamiento vertical en píxeles */
  sideOffset?: number;
}

/**
 * Panel flotante del menú contextual con posicionamiento anti-colisión y animación origin-aware.
 */
export const DropdownMenuContent: React.FC<UiDropdownContentProps> = ({
  align = 'end',
  sideOffset = 6,
  className,
  children,
  ...rest
}) => (
  <RadixDropdown.Portal>
    <RadixDropdown.Content
      align={align}
      sideOffset={sideOffset}
      className={`${styles.content} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </RadixDropdown.Content>
  </RadixDropdown.Portal>
);

/**
 * Propiedades de cada acción individual del menú desplegable (`DropdownMenuItem`).
 */
export interface UiDropdownItemProps extends RadixDropdown.DropdownMenuItemProps {
  /** Tono visual (`default` o destructivo `danger`) */
  tone?: 'default' | 'danger';
  /** Icono opcional a la izquierda */
  icon?: React.ReactNode;
  /** Atajo de teclado informativo a la derecha */
  shortcut?: string;
}

/**
 * Opción navegable por teclado dentro de un `DropdownMenuContent`.
 */
export const DropdownMenuItem: React.FC<UiDropdownItemProps> = ({
  tone = 'default',
  icon,
  shortcut,
  className,
  children,
  ...rest
}) => (
  <RadixDropdown.Item
    className={`${styles.item} ${tone === 'danger' ? styles.danger : ''} ${className ?? ''}`}
    {...rest}
  >
    {icon ? (
      <span className={styles.iconSlot} aria-hidden="true">
        {icon}
      </span>
    ) : null}
    <span>{children}</span>
    {shortcut ? <span className={styles.shortcut}>{shortcut}</span> : null}
  </RadixDropdown.Item>
);

/**
 * Separador hairline entre grupos de acciones del menú.
 */
export const DropdownMenuSeparator: React.FC<{ className?: string }> = ({ className }) => (
  <RadixDropdown.Separator className={`${styles.separator} ${className ?? ''}`} />
);

/**
 * Etiqueta de sección discreta dentro del menú desplegable.
 */
export const DropdownMenuLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <RadixDropdown.Label className={`${styles.label} ${className ?? ''}`}>{children}</RadixDropdown.Label>;
