import { apiClient } from './apiClient';
import { storageService } from './storageService';
import type { BulkActionReport } from '../types/media';

/**
 * Servicio para la ejecución masiva en lote de operaciones sobre imágenes y tablas
 * (`/bulk-delete` y `/bulk-move`).
 */
export class BulkService {
  /**
   * Elimina en lote hasta 50 imágenes física y lógicamente en `monolith-backend`.
   * Sincroniza inmediatamente el catálogo local con los identificadores eliminados con éxito.
   * @param ids Lista de identificadores UUID de las imágenes a eliminar.
   * @returns Reporte de ejecución con cantidad solicitada, éxitos y fallos.
   */
  async bulkDeleteImages(ids: string[]): Promise<BulkActionReport> {
    if (!ids || ids.length === 0) {
      return { totalRequested: 0, successful: [], failed: [] };
    }

    const report = await apiClient.post<BulkActionReport>('/api/v1/images/bulk-delete', {
      ids,
    });

    if (report.successful && report.successful.length > 0) {
      const successSet = new Set(report.successful);
      const remaining = storageService.getImages().filter((img) => !successSet.has(img.id));
      storageService.saveImages(remaining);
    }

    return report;
  }

  /**
   * Mueve en lote hasta 50 imágenes hacia otra carpeta de tipo `IMAGE` en `monolith-backend`.
   * @param ids Lista de identificadores UUID de las imágenes a reasignar.
   * @param targetFolderId UUID de la carpeta destino.
   * @returns Reporte de ejecución con los identificadores movidos exitosamente.
   */
  async bulkMoveImages(ids: string[], targetFolderId: string): Promise<BulkActionReport> {
    if (!ids || ids.length === 0) {
      return { totalRequested: 0, successful: [], failed: [] };
    }

    const report = await apiClient.post<BulkActionReport>('/api/v1/images/bulk-move', {
      ids,
      targetFolderId,
    });

    if (report.successful && report.successful.length > 0) {
      const successSet = new Set(report.successful);
      const updated = storageService.getImages().map((img) => {
        if (successSet.has(img.id)) {
          return { ...img, folderId: targetFolderId, updatedAt: new Date().toISOString() };
        }
        return img;
      });
      storageService.saveImages(updated);
    }

    return report;
  }

  /**
   * Elimina en lote hasta 50 datasets tabulares física y lógicamente en `monolith-backend`.
   * @param ids Lista de identificadores UUID de las tablas a eliminar.
   * @returns Reporte de ejecución con cantidad solicitada, éxitos y fallos.
   */
  async bulkDeleteTables(ids: string[]): Promise<BulkActionReport> {
    if (!ids || ids.length === 0) {
      return { totalRequested: 0, successful: [], failed: [] };
    }

    const report = await apiClient.post<BulkActionReport>('/api/v1/tables/bulk-delete', {
      ids,
    });

    if (report.successful && report.successful.length > 0) {
      const successSet = new Set(report.successful);
      const remaining = storageService.getTables().filter((t) => !successSet.has(t.id));
      storageService.saveTables(remaining);
    }

    return report;
  }

  /**
   * Mueve en lote hasta 50 datasets tabulares hacia otra carpeta de tipo `TABLE` en `monolith-backend`.
   * @param ids Lista de identificadores UUID de las tablas a reasignar.
   * @param targetFolderId UUID de la carpeta destino.
   * @returns Reporte de ejecución con los identificadores movidos exitosamente.
   */
  async bulkMoveTables(ids: string[], targetFolderId: string): Promise<BulkActionReport> {
    if (!ids || ids.length === 0) {
      return { totalRequested: 0, successful: [], failed: [] };
    }

    const report = await apiClient.post<BulkActionReport>('/api/v1/tables/bulk-move', {
      ids,
      targetFolderId,
    });

    if (report.successful && report.successful.length > 0) {
      const successSet = new Set(report.successful);
      const updated = storageService.getTables().map((t) => {
        if (successSet.has(t.id)) {
          return { ...t, folderId: targetFolderId, updatedAt: new Date().toISOString() };
        }
        return t;
      });
      storageService.saveTables(updated);
    }

    return report;
  }
}

export const bulkService = new BulkService();

