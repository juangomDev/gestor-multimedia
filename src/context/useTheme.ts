import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from './themeContextDef';

/**
 * Hook para acceder y alternar el tema editorial (`light`, `dark`, `system`).
 * @throws Error si se invoca fuera de `ThemeProvider`.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export type { ThemeContextValue };
