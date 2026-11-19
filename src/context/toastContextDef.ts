import { createContext } from 'react';
import type { UiToastTone } from '../components/ui/ToastViewport';

/**
 * Elemento de notificación efímera gestionado por `ToastContext`.
 */
export interface ToastItem {
  id: string;
  type: UiToastTone;
  title?: string;
  message: string;
}

/**
 * Contrato del contexto de notificaciones efímeras.
 */
export interface ToastContextValue {
  /** Muestra una notificación efímera en el `ToastViewport` editorial. */
  showToast: (message: string, type?: UiToastTone, title?: string) => void;
}

/** Contexto React para disparar notificaciones efímeras globales. */
export const ToastContext = createContext<ToastContextValue | undefined>(undefined);
