import { storageService } from '../storageService';
import type { ApiError } from './apiError';
import type { Role } from '../../types/auth';

interface RawRefreshPayload {
  token?: string;
  accessToken?: string;
  user?: {
    id?: string;
    username?: string;
    role?: Role;
    isActive?: boolean;
    createdById?: string | null;
  };
}

const REFRESH_TIMEOUT_MS = 10_000;

/**
 * Gestor de cola única de refresco de token JWT y suscriptores de revocación/rotación (`401`).
 * Garantiza que múltiples peticiones HTTP o conexiones SSE concurrentes con token expirado
 * disparen un único llamado a `POST /api/v1/auth/refresh` con timeout anti-deadlock.
 */
export class TokenRefreshQueue {
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string | null, error?: unknown) => void> = [];
  private unauthorizedListeners: Array<() => void> = [];
  private tokenRefreshedListeners: Array<(token: string) => void> = [];

  /**
   * Registra un listener que se ejecuta cuando la sesión es revocada o el refresh falla.
   *
   * @param listener Callback sin argumentos a invocar en caso de revocación.
   * @returns Función para cancelar la suscripción.
   */
  public onUnauthorized(listener: () => void): () => void {
    this.unauthorizedListeners.push(listener);
    return () => {
      this.unauthorizedListeners = this.unauthorizedListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Registra un listener notificado cada vez que un refresh `401` rota el access token JWT.
   *
   * @param listener Callback que recibe el nuevo JWT emitido.
   * @returns Función para cancelar la suscripción.
   */
  public onTokenRefreshed(listener: (token: string) => void): () => void {
    this.tokenRefreshedListeners.push(listener);
    return () => {
      this.tokenRefreshedListeners = this.tokenRefreshedListeners.filter((l) => l !== listener);
    };
  }

  private notifyUnauthorized(): void {
    this.unauthorizedListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn('Error in onUnauthorized listener:', err);
      }
    });
  }

  private notifyTokenRefreshed(token: string): void {
    this.tokenRefreshedListeners.forEach((listener) => {
      try {
        listener(token);
      } catch (err) {
        console.warn('Error in onTokenRefreshed listener:', err);
      }
    });
  }

  private subscribeTokenRefresh(cb: (token: string | null, error?: unknown) => void): void {
    this.refreshSubscribers.push(cb);
  }

  private onRefreshed(token: string | null, error?: unknown): void {
    this.refreshSubscribers.forEach((cb) => cb(token, error));
    this.refreshSubscribers = [];
  }

  /**
   * Ejecuta o comparte el refresco único contra `POST /api/v1/auth/refresh` usando cookies HttpOnly.
   * Protege contra hangs (timeout 10s) y contra resurrección de sesión si hubo `logout()` en vuelo.
   *
   * @param refreshUrl URL absoluta del endpoint de refresco.
   * @returns Promesa con el nuevo access token JWT emitido.
   */
  public async refreshToken(refreshUrl: string): Promise<string> {
    if (this.isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        this.subscribeTokenRefresh((newToken, error) => {
          if (error || !newToken) {
            reject(error ?? new Error('Token refresh failed'));
          } else {
            resolve(newToken);
          }
        });
      });
    }

    this.isRefreshing = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

    try {
      const refreshResponse = await fetch(refreshUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      if (!refreshResponse.ok) {
        throw new Error(`Refresh failed with status ${refreshResponse.status}`);
      }

      const refreshData = (await refreshResponse.json()) as RawRefreshPayload;
      const newToken = refreshData.token ?? refreshData.accessToken;
      if (!newToken) {
        throw new Error('Refresh response missing token');
      }

      // Si el usuario cerró sesión mientras el refresh estaba en vuelo, no resucitar la sesión
      if (!storageService.getSession()) {
        const clearedErr = new Error('Session cleared during token refresh');
        this.isRefreshing = false;
        this.onRefreshed(null, clearedErr);
        throw clearedErr;
      }

      storageService.saveToken(newToken);
      if (refreshData.user) {
        storageService.updateSessionUser(refreshData.user);
      }

      this.isRefreshing = false;
      this.onRefreshed(newToken);
      this.notifyTokenRefreshed(newToken);
      return newToken;
    } catch (refreshErr) {
      const sessionWasCleared =
        refreshErr instanceof Error && refreshErr.message === 'Session cleared during token refresh';
      this.isRefreshing = false;
      this.onRefreshed(null, refreshErr);
      if (!sessionWasCleared) {
        storageService.saveSession(null);
        this.notifyUnauthorized();
      }
      throw refreshErr;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Coordina la renovación del token JWT ante una respuesta `401` y reintenta la operación original.
   *
   * @param refreshUrl URL absoluta del endpoint de refresco.
   * @param retryOperation Función que reintenta la petición original con `_retry: true`.
   * @param originalError Error `401` original para propagar si la renovación falla.
   * @returns Promesa con el resultado de la operación reintentada.
   */
  public async handleTokenRefresh<T>(
    refreshUrl: string,
    retryOperation: () => Promise<T>,
    originalError: ApiError
  ): Promise<T> {
    try {
      await this.refreshToken(refreshUrl);
      return retryOperation();
    } catch {
      throw originalError;
    }
  }
}
