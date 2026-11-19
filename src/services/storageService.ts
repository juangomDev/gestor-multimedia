import {
  readStoredTheme,
  writeStoredTheme,
  resetThemeStorageCache,
  type ThemePreference,
} from '../context/themeStorage';
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
  apiKey: '',
};

const memoryCache = new Map<string, string | null>();
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
   * @returns Objeto `ClientConfig` con `baseUrl` y `apiKey` opcional.
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
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : '',
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
      apiKey: config.apiKey !== undefined ? config.apiKey.trim() : current.apiKey,
    };
    writeCachedItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    return updated;
  },

  /**
   * Devuelve la URL base activa del backend (`apiBaseUrl`).
   *
   * @returns URL base configurada o el valor de `VITE_API_BASE_URL` / `http://localhost:3000`.
   */
  getApiBaseUrl(): string {
    return this.getConfig().baseUrl;
  },

  /**
   * Actualiza y persiste la URL base del backend (`apiBaseUrl`).
   *
   * @param baseUrl Nueva URL base del servidor API.
   * @returns URL base normalizada y persistida.
   */
  setApiBaseUrl(baseUrl: string): string {
    return this.saveConfig({ baseUrl }).baseUrl;
  },

  /**
   * Recupera la sesión autenticada actual (`token` + `user`) si existe.
   *
   * @returns Sesión del usuario o `null` si no hay sesión activa.
   */
  getSession(): UserSession | null {
    try {
      const raw = readCachedItem(STORAGE_KEYS.AUTH_SESSION);
      return raw ? (JSON.parse(raw) as UserSession) : null;
    } catch {
      return null;
    }
  },

  /**
   * Persiste o elimina la sesión autenticada del usuario.
   *
   * @param session Sesión a guardar o `null` para cerrar sesión localmente.
   */
  saveSession(session: UserSession | null): void {
    if (!session) {
      writeCachedItem(STORAGE_KEYS.AUTH_SESSION, null);
    } else {
      writeCachedItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    }
  },

  /**
   * Devuelve el token JWT de acceso actual o `null` si no existe.
   *
   * @returns Access token JWT o `null`.
   */
  getToken(): string | null {
    const session = this.getSession();
    return session?.token || null;
  },

  /**
   * Actualiza únicamente el access token JWT preservando los datos del usuario en sesión.
   *
   * @param token Nuevo access token JWT emitido por el backend.
   */
  saveToken(token: string): void {
    const current = this.getSession();
    if (current) {
      this.saveSession({ ...current, token });
    } else {
      this.saveSession({
        token,
        user: { id: '', username: '', role: 'COLLABORATOR' },
      });
    }
  },

  /**
   * Mezcla cambios del perfil de usuario dentro de la sesión persistida.
   *
   * @param userData Campos parciales del perfil autenticado (`GET /api/v1/auth/me`).
   */
  updateSessionUser(userData: Partial<UserSession['user']>): void {
    const current = this.getSession();
    if (current) {
      this.saveSession({
        ...current,
        user: {
          ...current.user,
          ...userData,
        },
      });
    }
  },

  /**
   * Lee el modo de vista preferido para el explorador (`grid` o `list`).
   *
   * @returns Modo de vista persistido (`'grid'` por defecto).
   */
  getViewMode(): ExplorerViewMode {
    const raw = readCachedItem(STORAGE_KEYS.VIEW_MODE);
    return raw === 'list' ? 'list' : 'grid';
  },

  /**
   * Persiste el modo de vista del explorador (`grid` o `list`).
   *
   * @param mode Modo de vista seleccionado por el usuario.
   */
  setViewMode(mode: ExplorerViewMode): void {
    writeCachedItem(STORAGE_KEYS.VIEW_MODE, mode);
  },

  /**
   * Lee la preferencia de tema persistida (`light | dark | system`).
   *
   * @returns Preferencia de tema activa.
   */
  getTheme(): ThemePreference {
    return readStoredTheme();
  },

  /**
   * Persiste la preferencia de tema (`light | dark | system`).
   *
   * @param theme Nueva preferencia de tema.
   */
  setTheme(theme: ThemePreference): void {
    writeStoredTheme(theme);
  },
};
