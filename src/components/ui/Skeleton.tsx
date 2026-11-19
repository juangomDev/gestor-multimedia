import React from 'react';
import styles from './Skeleton.module.css';

/**
 * Variantes geométricas del placeholder de carga (`Skeleton`).
 */
export type UiSkeletonVariant = 'line' | 'card' | 'circle';

/**
 * Propiedades del placeholder de carga (`Skeleton`).
 */
export interface UiSkeletonProps {
  /** Forma base del placeholder */
  variant?: UiSkeletonVariant;
  /** Ancho CSS explícito opcional (ej. `"60%"` o `180`) */
  width?: number | string;
  /** Alto CSS explícito opcional */
  height?: number | string;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Indicador de carga suave con animación GPU exclusivamente sobre `opacity`,
 * adaptado a Modo Claro y Modo Oscuro sin saltos bruscos.
 */
export const Skeleton: React.FC<UiSkeletonProps> = ({
  variant = 'line',
  width,
  height,
  className,
}) => (
  <span
    aria-hidden="true"
    className={`${styles.skeleton} ${styles[variant]} ${className ?? ''}`}
    style={width !== undefined || height !== undefined ? { width, height } : undefined}
  />
);
