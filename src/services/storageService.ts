import { resetThemeStorageCache } from '../context/themeStorage';
import { getRememberMePreference } from './auth/sessionKeepAliveStorage';
import type { ClientConfig } from '../types/api';
import type { UserSession } from '../types/auth';

/**
 * Modo de visualización persistido para el explorador de carpetas y activos.
 */
export type ExplorerViewMode = 'grid' | 'list';

/**
 * Claves persistidas en `localStorage` en v2.
 * Solo almacena configuración de conexión, sesión autenticada y preferencias de UI
 * (cero entidades de negocio en `localStorage`).
 */
export const STORAGE_KEYS = {
  CONFIG: 'dokploy_config',
  AUTH_SESSION: 'dokploy_auth_session',
  VIEW_MODE: 'boveda_view_mode',
} as const;

/**
 * Configuración base por defecto de conectividad hacia `monolith-backend`.
 * En v2 no incluye ninguna `apiKey` hardcodeada.
 */
export const DEFAULT_CONFIG: ClientConfig = {
  baseUrl: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000',
};

const memoryCache = new Map<string, string | null>();
const baseUrlListeners = new Set<(baseUrl: string) => void>();
let cacheListenersAttached = false;

/**
 * Registra listeners de invalidación de caché ante cambios entre pestañas o retorno de foco.
 */
function ensureCacheListeners(): void {
  if (cacheListenersAttached || typeof window === 'undefined') return;
  cacheListenersAttached = true;

  window.addEventListener('storage', (event) => {
    if (event.key) {
      memoryCache.delete(event.key);
    } else {
      memoryCache.clear();
    }
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        memoryCache.clear();
      }
    });
  }
}

/**
 * Lee una clave desde la caché en memoria (`Map`) con fallback perezoso a `localStorage`.
 */
function readCachedItem(key: string): string | null {
  ensureCacheListeners();
  if (!memoryCache.has(key)) {
    try {
      memoryCache.set(key, localStorage.getItem(key));
    } catch {
      return null;
    }
  }
  return memoryCache.get(key) ?? null;
}

/**
 * Escribe o elimina una clave en `localStorage` manteniendo sincronizada la caché en memoria.
 */
function writeCachedItem(key: string, value: string | null): void {
  ensureCacheListeners();
  if (value === null) {
    memoryCache.set(key, null);
    try {
      localStorage.removeItem(key);
    } catch {
      // Almacenamiento no disponible (entornos restringidos)
    }
    return;
  }

  memoryCache.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // Almacenamiento no disponible (entornos restringidos)
  }
}

/**
 * Servicio de persistencia ligera con caché en memoria (`js-cache-storage`).
 * Gestiona exclusivamente URL de backend, sesión JWT, tema y modo de vista del explorador.
 */
export const storageService = {
  /**
   * Limpia la caché en memoria (`Map`) sin borrar el `localStorage` físico.
   */
  resetCache(): void {
    memoryCache.clear();
    resetThemeStorageCache();
  },

  /**
   * Obtiene la configuración activa de conexión con `monolith-backend`.
   *
   * @returns Objeto `ClientConfig` con `baseUrl`.
   */
  getConfig(): ClientConfig {
    try {
      const raw = readCachedItem(STORAGE_KEYS.CONFIG);
      if (!raw) return { ...DEFAULT_CONFIG };
      const parsed = JSON.parse(raw) as Partial<ClientConfig>;
      return {
        baseUrl:
          typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim()
            ? parsed.baseUrl.trim()
            : DEFAULT_CONFIG.baseUrl,
      };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  },

  /**
   * Actualiza parcialmente y persiste la configuración de conexión.
   *
   * @param config Campos de configuración a sobreescribir.
   * @returns Configuración resultante persistida.
   */
  saveConfig(config: Partial<ClientConfig>): ClientConfig {
    const current = this.getConfig();
    const updated: ClientConfig = {
      baseUrl:
        config.baseUrl !== undefined
          ? config.baseUrl.trim() || DEFAULT_CONFIG.baseUrl
          : current.baseUrl,
    };
    writeCachedItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    if (updated.baseUrl !== current.baseUrl) {
      baseUrlListeners.forEach((listener) => listener(updated.baseUrl));
    }
    return updated;
  },

  /** Suscribe un listener a los cambios de `apiBaseUrl` (p. ej. para reconectar SSE). */
  onBaseUrlChange(listener: (baseUrl: string) => void): () => void {
    baseUrlListeners.add(listener);
    return () => {
      baseUrlListeners.delete(listener);
    };
  },

  /** Devuelve la URL base activa del backend (`apiBaseUrl`). */
  getApiBaseUrl(): string {
    return this.getConfig().baseUrl;
  },

  /** Actualiza y persiste la URL base del backend (`apiBaseUrl`). */
  setApiBaseUrl(baseUrl: string): string {
    return this.saveConfig({ baseUrl }).baseUrl;
  },

  /**
   * Recupera la sesión autenticada actual (`token` + `user`) desde `localStorage` o `sessionStorage`.
   *
   * @returns Sesión del usuario o `null` si no hay sesión activa.
   */
  getSession(): UserSession | null {
    try {
      const rawLocal = readCachedItem(STORAGE_KEYS.AUTH_SESSION);
      if (rawLocal) return JSON.parse(rawLocal) as UserSession;
      if (typeof sessionStorage !== 'undefined') {
        const rawTab = sessionStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
        if (rawTab) return JSON.parse(rawTab) as UserSession;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Persiste o elimina la sesión autenticada del usuario respetando "Mantener sesión iniciada"
   * (`localStorage` cuando está activo; `sessionStorage` cuando es solo por pestaña).
   *
   * @param session Sesión a guardar o `null` para cerrar sesión localmente.
   */
  saveSession(session: UserSession | null): void {
    if (!session) {
      writeCachedItem(STORAGE_KEYS.AUTH_SESSION, null);
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
        }
      } catch {
        // Entorno restringido
      }
      return;
    }

    const serialized = JSON.stringify(session);
    if (getRememberMePreference()) {
      writeCachedItem(STORAGE_KEYS.AUTH_SESSION, serialized);
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
        }
      } catch {
        // Entorno restringido
      }
    } else {
      writeCachedItem(STORAGE_KEYS.AUTH_SESSION, null);
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEYS.AUTH_SESSION, serialized);
        }
      } catch {
        // Entorno restringido
      }
    }
  },

  /** Devuelve el token JWT de acceso actual o `null` si no existe. */
  getToken(): string | null {
    const session = this.getSession();
    return session?.token || null;
  },

  /**
   * Actualiza únicamente el access token JWT preservando los datos del usuario en sesión.
   * No crea una sesión fantasma si el usuario cerró sesión mientras un refresco estaba en vuelo.
   */
  saveToken(token: string): void {
    const current = this.getSession();
    if (!current) return;
    this.saveSession({ ...current, token });
  },

  /** Mezcla cambios del perfil de usuario dentro de la sesión persistida. */
  updateSessionUser(userData: Partial<UserSession['user']>): void {
    const current = this.getSession();
    if (current) {
      this.saveSession({
        ...current,
        user: { ...current.user, ...userData },
      });
    }
  },

  /** Lee el modo de vista preferido para el explorador (`grid` o `list`). */
  getViewMode(): ExplorerViewMode {
    const raw = readCachedItem(STORAGE_KEYS.VIEW_MODE);
    return raw === 'list' ? 'list' : 'grid';
  },

  /** Persiste el modo de vista del explorador (`grid` o `list`). */
  setViewMode(mode: ExplorerViewMode): void {
    writeCachedItem(STORAGE_KEYS.VIEW_MODE, mode);
  },
};
