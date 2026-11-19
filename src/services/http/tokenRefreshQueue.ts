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

/**
 * Gestor de cola única de refresco de token JWT y suscriptores de revocación de sesión (`401`).
 * Garantiza que múltiples peticiones HTTP o conexiones SSE concurrentes con token expirado
 * disparen un único llamado a `POST /api/v1/auth/refresh`.
 */
export class TokenRefreshQueue {
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string | null, error?: unknown) => void> = [];
  private unauthorizedListeners: Array<() => void> = [];

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
   * Notifica a todos los listeners registrados que la sesión ya no es válida.
   */
  private notifyUnauthorized(): void {
    this.unauthorizedListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn('Error in onUnauthorized listener:', err);
      }
    });
  }

  /**
   * Añade un callback a la cola de operaciones en espera de un nuevo access token.
   */
  private subscribeTokenRefresh(cb: (token: string | null, error?: unknown) => void): void {
    this.refreshSubscribers.push(cb);
  }

  /**
   * Resuelve o rechaza todas las operaciones encoladas tras finalizar el intento de refresco.
   */
  private onRefreshed(token: string | null, error?: unknown): void {
    this.refreshSubscribers.forEach((cb) => cb(token, error));
    this.refreshSubscribers = [];
  }

  /**
   * Ejecuta o comparte el refresco único contra `POST /api/v1/auth/refresh` usando cookies HttpOnly.
   * Actualiza la sesión local con el nuevo JWT (`token` o `accessToken`) y notifica en caso de fallo.
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

    try {
      const refreshResponse = await fetch(refreshUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!refreshResponse.ok) {
        throw new Error(`Refresh failed with status ${refreshResponse.status}`);
      }

      const refreshData = (await refreshResponse.json()) as RawRefreshPayload;
      const newToken = refreshData.token ?? refreshData.accessToken;
      if (!newToken) {
        throw new Error('Refresh response missing token');
      }

      storageService.saveToken(newToken);
      if (refreshData.user) {
        storageService.updateSessionUser(refreshData.user);
      }

      this.isRefreshing = false;
      this.onRefreshed(newToken);
      return newToken;
    } catch (refreshErr) {
      this.isRefreshing = false;
      this.onRefreshed(null, refreshErr);
      storageService.saveSession(null);
      this.notifyUnauthorized();
      throw refreshErr;
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
