import React from 'react';
import { Skeleton } from '../../components/ui/Skeleton';
import styles from './RouteSkeleton.module.css';

/**
 * Propiedades del placeholder editorial para rutas con carga diferida (`React.lazy`).
 */
export interface RouteSkeletonProps {
  /** Variante de diseño (`workspace` dentro del shell o `fullscreen` para validación inicial). */
  variant?: 'workspace' | 'fullscreen';
  /** Etiqueta accesible anunciada durante la carga. */
  label?: string;
}

/**
 * Fallback editorial para `Suspense` con esqueletos sutiles en tokens Claro/Oscuro.
 */
export const RouteSkeleton: React.FC<RouteSkeletonProps> = ({
  variant = 'workspace',
  label = 'Cargando vista...',
}) => {
  if (variant === 'fullscreen') {
    return (
      <div className={styles.fullPage} role="status" aria-live="polite" aria-label={label}>
        <div className={styles.sessionCard}>
          <Skeleton variant="line" width={140} height={18} />
          <span className={styles.sessionLabel}>{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} role="status" aria-live="polite" aria-label={label}>
      <div className={styles.header}>
        <div className={styles.headingLines}>
          <Skeleton variant="line" width={220} height={22} />
          <Skeleton variant="line" width={340} height={14} />
        </div>
        <Skeleton variant="line" width={120} height={36} />
      </div>

      <div className={styles.grid}>
        <Skeleton variant="card" height={116} />
        <Skeleton variant="card" height={116} />
        <Skeleton variant="card" height={116} />
        <Skeleton variant="card" height={116} />
      </div>
    </div>
  );
};
