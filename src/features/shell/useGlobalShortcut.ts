import { useEffect, useRef } from 'react';

type ShortcutCallback = (event: KeyboardEvent) => void;

const shortcutRegistry = new Map<string, Set<ShortcutCallback>>();
let totalRegistrations = 0;

/**
 * Listener global único deduplicado (`client-event-listeners`):
 * sin importar cuántos componentes registren atajos `⌘/<Ctrl>+<tecla>`,
 * solo existe un único listener `keydown` montado en `window`.
 */
function handleGlobalKeyDown(event: KeyboardEvent): void {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
  const normalizedKey = event.key.toLowerCase();
  const handlers = shortcutRegistry.get(normalizedKey);
  if (!handlers || handlers.size === 0) return;

  handlers.forEach((cb) => cb(event));
}

/**
 * Suscribe un atajo global `⌘ + <key>` / `Ctrl + <key>` compartiendo un único listener
 * en `window` (patrón `client-event-listeners` de Vercel React Best Practices).
 *
 * @param key Tecla en minúsculas a escuchar junto con `Meta` o `Ctrl` (ej. `'k'`).
 * @param callback Función a invocar al pulsar la combinación.
 * @param enabled Permite desactivar temporalmente la suscripción sin desmontar el componente.
 */
export function useGlobalShortcut(
  key: string,
  callback: ShortcutCallback,
  enabled: boolean = true
): void {
  const callbackRef = useRef<ShortcutCallback>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const normalizedKey = key.toLowerCase();
    const stableHandler: ShortcutCallback = (event) => {
      callbackRef.current(event);
    };

    let keySet = shortcutRegistry.get(normalizedKey);
    if (!keySet) {
      keySet = new Set();
      shortcutRegistry.set(normalizedKey, keySet);
    }

    if (totalRegistrations === 0) {
      window.addEventListener('keydown', handleGlobalKeyDown);
    }

    keySet.add(stableHandler);
    totalRegistrations += 1;

    return () => {
      const currentSet = shortcutRegistry.get(normalizedKey);
      if (currentSet) {
        currentSet.delete(stableHandler);
        if (currentSet.size === 0) {
          shortcutRegistry.delete(normalizedKey);
        }
      }
      totalRegistrations = Math.max(0, totalRegistrations - 1);
      if (totalRegistrations === 0) {
        window.removeEventListener('keydown', handleGlobalKeyDown);
      }
    };
  }, [key, enabled]);
}
