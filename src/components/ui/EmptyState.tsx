import React from 'react';
import styles from './EmptyState.module.css';

/**
 * Propiedades del estado vacío editorial (`EmptyState`).
 */
export interface UiEmptyStateProps {
  /** Icono ilustrativo sobrio */
  icon?: React.ReactNode;
  /** Título principal del estado vacío */
  title: string;
  /** Explicación breve y accionable */
  description?: string;
  /** Botón o grupo de acciones sugeridas */
  action?: React.ReactNode;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Componente de estado vacío consistente para carpetas, búsquedas sin resultados,
 * bandejas de formularios y tablas vacías.
 */
export const EmptyState: React.FC<UiEmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div className={`${styles.container} ${className ?? ''}`}>
    {icon ? (
      <div className={styles.iconBox} aria-hidden="true">
        {icon}
      </div>
    ) : null}
    <h3 className={styles.title}>{title}</h3>
    {description ? <p className={styles.description}>{description}</p> : null}
    {action ? <div className={styles.actions}>{action}</div> : null}
  </div>
);
