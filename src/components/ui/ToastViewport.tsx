import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import styles from './ToastViewport.module.css';

/**
 * Niveles semánticos de notificación efímera (`Toast`).
 */
export type UiToastTone = 'success' | 'error' | 'info' | 'warning';

/**
 * Estructura de un mensaje mostrado por `ToastViewport`.
 */
export interface UiToastRecord {
  id: string;
  title?: string;
  message: string;
  type: UiToastTone;
}

/**
 * Propiedades del contenedor de toasts editoriales (`ToastViewport`).
 */
export interface ToastViewportProps {
  /** Lista ordenada de toasts activos */
  toasts: UiToastRecord[];
  /** Callback para cerrar un toast específico */
  onDismiss: (id: string) => void;
}

const ICONS: Record<UiToastTone, React.FC<{ size?: number }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

/**
 * Contenedor accesible (`aria-live="polite"`) de notificaciones efímeras con lomo
 * cromático semántico y entrada GPU sin saltos de layout.
 */
export const ToastViewport: React.FC<ToastViewportProps> = ({ toasts, onDismiss }) => {
  const viewport = (
    <div
      className={styles.viewport}
      role="region"
      aria-label="Notificaciones del sistema"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`${styles.toast} ${styles[toast.type]}`}
          >
            <span className={styles.icon} aria-hidden="true">
              <Icon size={16} />
            </span>
            <div className={styles.body}>
              {toast.title ? <span className={styles.title}>{toast.title}</span> : null}
              <span className={styles.message}>{toast.message}</span>
            </div>
            <button
              type="button"
              className={styles.dismissBtn}
              onClick={() => onDismiss(toast.id)}
              aria-label="Cerrar notificación"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(viewport, document.body);
  }
  return viewport;
};
