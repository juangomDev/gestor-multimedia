import { apiClient } from './apiClient';

/**
 * Representación de una clave API de integración registrada en el sistema.
 */
export interface ApiKeyItem {
  id: string;
  name: string;
  description?: string | null;
  keyPrefix: string;
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
}

/**
 * Respuesta devuelta al crear una nueva clave API (incluye el secreto plano por única vez).
 */
export interface ApiKeyCreatedResponse extends ApiKeyItem {
  key: string;
}

/**
 * Datos requeridos para generar una nueva clave API de integración M2M.
 */
export interface CreateApiKeyInput {
  name: string;
  description?: string;
  rateLimit?: number;
}

/**
 * Payload parcial para actualizar una API Key existente sin revocar su secreto
 * (`PATCH /api/v1/api-keys/:id`).
 */
export interface UpdateApiKeyInput {
  name?: string;
  description?: string | null;
  rateLimit?: number;
  isActive?: boolean;
}

/**
 * Servicio para la administración dinámica de claves de integración API (`/api/v1/api-keys`)
 * exclusivo para usuarios con rol `ADMIN`.
 */
export class ApiKeysService {
  /**
   * Obtiene el listado de API Keys autorizadas ocultando el secreto criptográfico.
   * @returns Lista de claves con sus prefijos y estadísticas de uso.
   */
  async listApiKeys(): Promise<ApiKeyItem[]> {
    const res = await apiClient.get<{ keys?: ApiKeyItem[] } | ApiKeyItem[]>('/api/v1/api-keys');
    if (Array.isArray(res)) {
      return res;
    }
    return res.keys || [];
  }

  /**
   * Genera una nueva clave API retornando el secreto en texto plano por única vez.
   * @param payload Nombre, descripción opcional y cuota de peticiones por minuto.
   * @returns Clave creada con el campo secreto `key`.
   */
  async createApiKey(payload: CreateApiKeyInput): Promise<ApiKeyCreatedResponse> {
    return apiClient.post<ApiKeyCreatedResponse>('/api/v1/api-keys', payload);
  }

  /**
   * Actualiza configuración o estado activo/pausado de una API Key sin revocar la llave criptográfica
   * (`PATCH /api/v1/api-keys/:id`).
   *
   * @param id UUID de la clave a actualizar.
   * @param payload Campos parciales (`name`, `description`, `rateLimit`, `isActive`).
   * @returns Registro actualizado de la API Key.
   */
  async updateApiKey(id: string, payload: UpdateApiKeyInput): Promise<ApiKeyItem> {
    const res = await apiClient.patch<ApiKeyItem | { key?: ApiKeyItem; data?: ApiKeyItem }>(
      `/api/v1/api-keys/${encodeURIComponent(id)}`,
      payload
    );
    if ('data' in res && res.data) return res.data;
    if ('key' in res && res.key && typeof res.key === 'object') return res.key;
    return res as ApiKeyItem;
  }

  /**
   * Revoca y destruye permanentemente una API Key en `monolith-backend`.
   * @param id UUID de la clave a revocar.
   */
  async deleteApiKey(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/api-keys/${id}`);
  }
}

export const apiKeysService = new ApiKeysService();

