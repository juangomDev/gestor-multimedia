import { useContext } from 'react';
import { ShellContext, type ShellContextValue } from './shellContextDef';

/**
 * Hook para consumir el estado y acciones del App Shell v2 (`activeFolder`, `⌘K`, subida contextual y visores).
 *
 * @returns Contrato `ShellContextValue` activo.
 */
export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error('useShell debe utilizarse dentro de un ShellProvider (AppLayout)');
  }
  return ctx;
}
