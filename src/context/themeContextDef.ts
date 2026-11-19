import { createContext } from 'react';
import type { ResolvedTheme, ThemePreference } from './themeStorage';

/**
 * Contrato expuesto por `ThemeContext` para controlar el tema dual Claro / Oscuro.
 */
export interface ThemeContextValue {
  /** Preferencia seleccionada (`light`, `dark` o `system`) */
  preference: ThemePreference;
  /** Tema efectivo actualmente aplicado en `<html data-theme="...">` */
  resolvedTheme: ResolvedTheme;
  /** Actualiza y persiste la preferencia de tema */
  setPreference: (next: ThemePreference) => void;
  /** Alterna directamente entre claro y oscuro partiendo del tema efectivo */
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
