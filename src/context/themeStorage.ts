/**
 * Preferencia de tema elegida por el usuario (`light`, `dark` o seguir al sistema).
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Tema efectivo aplicado en el DOM (`data-theme`).
 */
export type ResolvedTheme = 'light' | 'dark';

/** Clave en `localStorage` compartida con el script anti-flicker de `index.html`. */
export const THEME_STORAGE_KEY = 'boveda_theme';

const memoryCache = new Map<string, string | null>();
let listenersAttached = false;

/**
 * Suscribe listeners de invalidación de caché ante cambios externos de almacenamiento.
 */
function ensureCacheListeners(): void {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  window.addEventListener('storage', (event) => {
    if (event.key) memoryCache.delete(event.key);
    else memoryCache.clear();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      memoryCache.clear();
    }
  });
}

/**
 * Lee la preferencia de tema desde caché en memoria / `localStorage`.
 */
export function readStoredTheme(): ThemePreference {
  ensureCacheListeners();
  try {
    if (!memoryCache.has(THEME_STORAGE_KEY)) {
      memoryCache.set(THEME_STORAGE_KEY, localStorage.getItem(THEME_STORAGE_KEY));
    }
    const raw = memoryCache.get(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
    return 'system';
  } catch {
    return 'system';
  }
}

/**
 * Persiste la preferencia de tema en `localStorage` y actualiza la caché en memoria.
 */
export function writeStoredTheme(preference: ThemePreference): void {
  ensureCacheListeners();
  memoryCache.set(THEME_STORAGE_KEY, preference);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Almacenamiento no disponible (modo privado restrictivo)
  }
}

/**
 * Limpia la caché en memoria de tema (útil en suites de prueba).
 */
export function resetThemeStorageCache(): void {
  memoryCache.clear();
}

/**
 * Consulta la preferencia actual de color del sistema operativo.
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
