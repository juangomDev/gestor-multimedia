import { storageService } from '../storageService';
import type { ApiError } from './apiError';

/**
 * Gestor de cola de refresco de token JWT y suscriptores de revocación de sesión (`401`).
 * Garantiza que múltiples peticiones concurrentes con token expirado disparen un único
 * llamado a `POST /api/v1/auth/refresh`.
 */
export class TokenRefreshQueue {
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string | null, error?: any) => void> = [];
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
    this.unauthorizedListeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.warn('Error in onUnauthorized listener:', err);
      }
    });
  }

  /**
   * Añade un callback a la cola de peticiones en espera de un nuevo token.
   */
  private subscribeTokenRefresh(cb: (token: string | null, error?: any) => void): void {
    this.refreshSubscribers.push(cb);
  }

  /**
   * Resuelve o rechaza todas las peticiones encoladas tras finalizar el intento de refresco.
   */
  private onRefreshed(token: string | null, error?: any): void {
    this.refreshSubscribers.forEach((cb) => cb(token, error));
    this.refreshSubscribers = [];
  }

  /**
   * Coordina la renovación del token JWT contra `/api/v1/auth/refresh` y reintenta la operación original.
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
    if (this.isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        this.subscribeTokenRefresh((newToken, error) => {
          if (error || !newToken) {
            reject(originalError);
          } else {
            resolve(retryOperation());
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
      });

      if (!refreshResponse.ok) {
        throw new Error(`Refresh failed with status ${refreshResponse.status}`);
      }

      const refreshData = await refreshResponse.json();
      const newToken = refreshData.token;
      if (!newToken) {
        throw new Error('Refresh response missing token');
      }

      storageService.saveToken(newToken);
      if (refreshData.user) {
        storageService.updateSessionUser(refreshData.user);
      }

      this.isRefreshing = false;
      this.onRefreshed(newToken);

      return retryOperation();
    } catch (refreshErr) {
      this.isRefreshing = false;
      this.onRefreshed(null, refreshErr);
      storageService.saveSession(null);
      this.notifyUnauthorized();
      throw originalError;
    }
  }
}

