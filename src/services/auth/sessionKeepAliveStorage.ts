import type { LoginCredentials } from '../../types/auth';

/**
 * Claves de almacenamiento para recordar usuario y mantener viva la sesión
 * cuando el navegador bloquea cookies `HttpOnly` de refresco a los 15 minutos.
 */
export const KEEP_ALIVE_KEYS = {
  REMEMBER_ME: 'boveda_remember_me',
  REMEMBERED_USERNAME: 'boveda_remembered_username',
  KEEP_ALIVE_CREDENTIALS: 'boveda_keep_alive_auth',
} as const;

/**
 * Codifica una cadena en Base64 UTF-8 para ofuscar credenciales de respaldo en almacenamiento local.
 */
function encodePayload(raw: string): string {
  try {
    const bytes = new TextEncoder().encode(raw);
    let binary = '';
    for (const b of bytes) {
      binary += String.fromCharCode(b);
    }
    return btoa(binary);
  } catch {
    return '';
  }
}

/**
 * Decodifica una cadena Base64 UTF-8 previamente ofuscada con `encodePayload`.
 */
function decodePayload(encoded: string): string {
  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

/**
 * Lee si el usuario eligió mantener su sesión iniciada (`true` por defecto).
 *
 * @returns `true` cuando la sesión debe persistir en `localStorage` y auto-renovarse.
 */
export function getRememberMePreference(): boolean {
  try {
    const raw = localStorage.getItem(KEEP_ALIVE_KEYS.REMEMBER_ME);
    return raw !== 'false';
  } catch {
    return true;
  }
}

/**
 * Persiste la preferencia de "Mantener sesión iniciada".
 * Si se desactiva (`false`), elimina inmediatamente cualquier credencial de respaldo en `localStorage`.
 *
 * @param remember `true` para mantener la sesión hasta cerrar sesión manualmente.
 */
export function setRememberMePreference(remember: boolean): void {
  try {
    localStorage.setItem(KEEP_ALIVE_KEYS.REMEMBER_ME, remember ? 'true' : 'false');
    if (!remember) {
      localStorage.removeItem(KEEP_ALIVE_KEYS.KEEP_ALIVE_CREDENTIALS);
    }
  } catch {
    // Entorno sin acceso a localStorage
  }
}

/**
 * Obtiene el último nombre de usuario recordado para pre-rellenar el formulario de login.
 *
 * @returns Nombre de usuario recordado o cadena vacía.
 */
export function getRememberedUsername(): string {
  try {
    return localStorage.getItem(KEEP_ALIVE_KEYS.REMEMBERED_USERNAME) || '';
  } catch {
    return '';
  }
}

/**
 * Guarda o limpia el nombre de usuario recordado según la preferencia `rememberMe`.
 *
 * @param username Nombre de usuario autenticado.
 * @param remember Indica si debe recordarse para futuros inicios de sesión.
 */
export function saveRememberedUsername(username: string, remember: boolean): void {
  try {
    if (remember && username.trim()) {
      localStorage.setItem(KEEP_ALIVE_KEYS.REMEMBERED_USERNAME, username.trim());
    } else if (!remember) {
      localStorage.removeItem(KEEP_ALIVE_KEYS.REMEMBERED_USERNAME);
    }
  } catch {
    // Entorno restringido
  }
}

/**
 * Guarda las credenciales de respaldo para re-autenticación silenciosa cuando
 * "Mantener sesión iniciada" está activo y la cookie `HttpOnly` de 15 min no está disponible.
 *
 * @param credentials Usuario y contraseña validados por `/api/v1/auth/login`.
 */
export function saveKeepAliveCredentials(credentials: LoginCredentials): void {
  if (!getRememberMePreference()) {
    clearKeepAliveCredentials();
    return;
  }
  try {
    const encoded = encodePayload(
      JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      })
    );
    if (encoded) {
      localStorage.setItem(KEEP_ALIVE_KEYS.KEEP_ALIVE_CREDENTIALS, encoded);
    }
  } catch {
    // Entorno restringido
  }
}

/**
 * Lee las credenciales de respaldo si "Mantener sesión iniciada" está activo.
 *
 * @returns Credenciales `{ username, password }` o `null` si no existen o se desactivó `rememberMe`.
 */
export function readKeepAliveCredentials(): LoginCredentials | null {
  if (!getRememberMePreference()) return null;
  try {
    const raw = localStorage.getItem(KEEP_ALIVE_KEYS.KEEP_ALIVE_CREDENTIALS);
    if (!raw) return null;
    const decoded = decodePayload(raw);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded) as Partial<LoginCredentials>;
    if (
      typeof parsed.username === 'string' &&
      parsed.username.trim() &&
      typeof parsed.password === 'string' &&
      parsed.password
    ) {
      return { username: parsed.username, password: parsed.password };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Elimina las credenciales de respaldo (invocado obligatoriamente al cerrar sesión manualmente).
 */
export function clearKeepAliveCredentials(): void {
  try {
    localStorage.removeItem(KEEP_ALIVE_KEYS.KEEP_ALIVE_CREDENTIALS);
  } catch {
    // Entorno restringido
  }
}
