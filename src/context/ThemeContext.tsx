import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeContext } from './themeContextDef';
import {
  getSystemTheme,
  readStoredTheme,
  writeStoredTheme,
  type ResolvedTheme,
  type ThemePreference,
} from './themeStorage';

/**
 * Propiedades del proveedor global de tema Claro / Oscuro (`ThemeProvider`).
 */
export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Preferencia inicial opcional para pruebas o entornos embebidos */
  initialPreference?: ThemePreference;
}

/**
 * Proveedor de tema "Archivo Editorial" con soporte `light | dark | system`,
 * sincronización con `matchMedia` y actualización del atributo `<html data-theme>`.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialPreference,
}) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => initialPreference ?? readStoredTheme()
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  const resolvedTheme: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeStoredTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemePreference = resolvedTheme === 'dark' ? 'light' : 'dark';
    setPreferenceState(next);
    writeStoredTheme(next);
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference, toggleTheme }),
    [preference, resolvedTheme, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
