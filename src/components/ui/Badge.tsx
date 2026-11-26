import React from 'react';
import styles from './Badge.module.css';

/**
 * Tonos semánticos soportados por `Badge`.
 */
export type UiBadgeTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';

/**
 * Tipo de artefacto opcional para mostrar un punto indicador cromático del lomo.
 */
export type UiArtifactDot = 'container' | 'image' | 'table' | 'pdf' | 'form';

/**
 * Propiedades de la insignia editorial (`Badge`).
 */
export interface UiBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Contenido de la insignia */
  children: React.ReactNode;
  /** Tono semántico */
  tone?: UiBadgeTone;
  /** Punto cromático opcional según tipo de artefacto */
  artifactDot?: UiArtifactDot;
  /** Aplica fuente monoespaciada con números tabulares */
  mono?: boolean;
}

const DOT_CLASS: Record<UiArtifactDot, string> = {
  container: styles.dotContainer,
  image: styles.dotImage,
  table: styles.dotTable,
  pdf: styles.dotPdf,
  form: styles.dotForm,
};

/**
 * Insignia compacta para estados, roles, contadores y tipos de archivo.
 */
export const Badge: React.FC<UiBadgeProps> = ({
  children,
  tone = 'neutral',
  artifactDot,
  mono = false,
  className,
  ...rest
}) => (
  <span
    {...rest}
    className={`${styles.badge} ${styles[tone]} ${mono ? styles.mono : ''} ${className ?? ''}`}
  >
    {artifactDot ? <span className={`${styles.dot} ${DOT_CLASS[artifactDot]}`} aria-hidden="true" /> : null}
    {children}
  </span>
);
