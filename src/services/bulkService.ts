import { apiClient } from './apiClient';
import type { BulkActionReport } from '../types/media';

/**
 * Servicio sin estado para la ejecución masiva en lote sobre imágenes y tablas
 * (`/bulk-delete` y `/bulk-move`, hasta 50 IDs por petición).
 */
export class BulkService {
  /**
   * Elimina en lote hasta 50 imágenes física y lógicamente en `monolith-backend`.
   *
   * @param ids Lista de UUIDs de las imágenes a eliminar.
   * @returns Reporte de ejecución con éxitos y fallos parciales.
   */
  async bulkDeleteImages(ids: string[]): Promise<BulkActionReport> {
    if (!ids || ids.length === 0) {
      return { totalRequested: 0, successful: [], failed: [] };
    }
    return apiClient.post<BulkActionReport>('/api/v1/images/bulk-delete', { ids });
  }

  /**
   * Mueve en lote hasta 50 imágenes hacia otra carpeta de tipo `IMAGE` en `monolith-backend`.
   *
   * @param ids Lista de UUIDs de las imágenes a reasignar.
   * @param targetFolderId UUID de la carpeta destino compatible.
   * @returns Reporte de ejecución con éxitos y fallos parciales.
   */
  async bulkMoveImages(ids: string[], targetFolderId: string): Promise<BulkActionReport> {
    if (!ids || ids.length === 0) {
      return { totalRequested: 0, successful: [], failed: [] };
    }
    return apiClient.post<BulkActionReport>('/api/v1/images/bulk-move', {
      ids,
      targetFolderId,
    });
  }

  /**
   * Elimina en lote hasta 50 datasets tabulares física y lógicamente en `monolith-backend`.
   *
   * @param ids Lista de UUIDs de las tablas a eliminar.
   * @returns Reporte de ejecución con éxitos y fallos parciales.
   */
  async bulkDeleteTables(ids: string[]): Promise<BulkActionReport> {
    if (!ids || ids.length === 0) {
      return { totalRequested: 0, successful: [], failed: [] };
    }
    return apiClient.post<BulkActionReport>('/api/v1/tables/bulk-delete', { ids });
  }

  /**
   * Mueve en lote hasta 50 datasets tabulares hacia otra carpeta de tipo `TABLE` en `monolith-backend`.
   *
   * @param ids Lista de UUIDs de las tablas a reasignar.
   * @param targetFolderId UUID de la carpeta destino compatible.
   * @returns Reporte de ejecución con éxitos y fallos parciales.
   */
  async bulkMoveTables(ids: string[], targetFolderId: string): Promise<BulkActionReport> {
    if (!ids || ids.length === 0) {
      return { totalRequested: 0, successful: [], failed: [] };
    }
    return apiClient.post<BulkActionReport>('/api/v1/tables/bulk-move', {
      ids,
      targetFolderId,
    });
  }
}

/** Instancia singleton del servicio de acciones en lote. */
export const bulkService = new BulkService();
