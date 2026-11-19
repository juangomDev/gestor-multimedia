import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import styles from './Tabs.module.css';

/** Raíz de pestañas accesibles (`@radix-ui/react-tabs`). */
export const Tabs = RadixTabs.Root;

/**
 * Propiedades de la barra de pestañas (`TabsList`).
 */
export interface UiTabsListProps extends RadixTabs.TabsListProps {
  /** Estilo de presentación: línea inferior editorial o cápsulas en bandeja */
  variant?: 'underline' | 'pills';
}

/**
 * Contenedor horizontal de pestañas navegables con flechas del teclado.
 */
export const TabsList: React.FC<UiTabsListProps> = ({
  variant = 'underline',
  className,
  ...rest
}) => (
  <RadixTabs.List
    className={`${variant === 'pills' ? styles.listPills : styles.list} ${className ?? ''}`}
    {...rest}
  />
);

/**
 * Disparador individual de pestaña (`TabsTrigger`).
 */
export const TabsTrigger: React.FC<RadixTabs.TabsTriggerProps> = ({ className, ...rest }) => (
  <RadixTabs.Trigger className={`${styles.trigger} ${className ?? ''}`} {...rest} />
);

/**
 * Contenido asociado a cada pestaña (`TabsContent`).
 */
export const TabsContent: React.FC<RadixTabs.TabsContentProps> = ({ className, ...rest }) => (
  <RadixTabs.Content className={`${styles.content} ${className ?? ''}`} {...rest} />
);
