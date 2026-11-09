import { describe, it, expect, vi, beforeEach } from 'vitest';
import { imagesService } from './imagesService';
import { tablesService } from './tablesService';
import { pdfsService } from './pdfsService';
import { storageService } from './storageService';
import { apiClient } from './apiClient';

describe('Media Deletion Resilience (Images, Tables & PDFs)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.saveImages([]);
    storageService.saveTables([]);
    storageService.savePdfs([]);
  });

  describe('imagesService.deleteImage', () => {
    it('elimina imagen en el backend cuando el ID es un UUID válido', async () => {
      const uuid = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      storageService.saveImages([
        { id: uuid, shortCode: 'img-1', originalName: 'foto.png', mimeType: 'image/png', sizeBytes: 100, url: '', createdAt: '' },
      ]);
      const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);

      await imagesService.deleteImage(uuid, 'img-1');

      expect(deleteSpy).toHaveBeenCalledWith(`/api/v1/images/${uuid}`);
      expect(storageService.getImages()).toHaveLength(0);
    });

    it('elimina localmente sin error si el servidor responde 404 Not Found', async () => {
      const uuid = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      storageService.saveImages([
        { id: uuid, shortCode: 'img-1', originalName: 'foto.png', mimeType: 'image/png', sizeBytes: 100, url: '', createdAt: '' },
      ]);
      vi.spyOn(apiClient, 'delete').mockRejectedValue({ status: 404, message: 'Not found' });

      await imagesService.deleteImage(uuid, 'img-1');
      expect(storageService.getImages()).toHaveLength(0);
    });

    it('elimina de storage sin error si el backend responde 400 Bad Request (ej. ID no UUID)', async () => {
      const localId = 'img-local-999';
      storageService.saveImages([
        { id: localId, shortCode: 'local-1', originalName: 'foto.png', mimeType: 'image/png', sizeBytes: 100, url: '', createdAt: '' },
      ]);
      const deleteSpy = vi.spyOn(apiClient, 'delete').mockRejectedValue({ status: 400, message: 'El ID de la imagen debe ser un UUID válido' });

      await imagesService.deleteImage(localId, 'local-1');

      expect(deleteSpy).toHaveBeenCalledWith(`/api/v1/images/${localId}`);
      expect(storageService.getImages()).toHaveLength(0);
    });
  });

  describe('tablesService.deleteTable', () => {
    it('elimina tabla en el backend cuando el ID es UUID y limpia storage', async () => {
      const uuid = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
      storageService.saveTables([
        { id: uuid, shortCode: 'tbl-1', tableName: 'datos.csv', rowCount: 10, columnCount: 2, sizeBytes: 50, url: '', createdAt: '' },
      ]);
      const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);

      await tablesService.deleteTable(uuid, 'tbl-1');

      expect(deleteSpy).toHaveBeenCalledWith(`/api/v1/tables/${uuid}`);
      expect(storageService.getTables()).toHaveLength(0);
    });

    it('elimina localmente si el backend responde 404', async () => {
      const uuid = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
      storageService.saveTables([
        { id: uuid, shortCode: 'tbl-1', tableName: 'datos.csv', rowCount: 10, columnCount: 2, sizeBytes: 50, url: '', createdAt: '' },
      ]);
      vi.spyOn(apiClient, 'delete').mockRejectedValue({ status: 404, message: 'Tabla no encontrada' });

      await tablesService.deleteTable(uuid, 'tbl-1');
      expect(storageService.getTables()).toHaveLength(0);
    });
  });

  describe('pdfsService.deletePdf', () => {
    it('elimina PDF en el backend cuando el ID es UUID y limpia storage', async () => {
      const uuid = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
      storageService.savePdfs([
        { id: uuid, shortCode: 'pdf-1', originalName: 'doc.pdf', sizeBytes: 200, pageCount: 2, isScanned: false, url: '', createdAt: '' },
      ]);
      const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);

      await pdfsService.deletePdf(uuid);

      expect(deleteSpy).toHaveBeenCalledWith(`/api/v1/pdfs/${uuid}`);
      expect(storageService.getPdfs()).toHaveLength(0);
    });

    it('elimina localmente si el backend responde 404', async () => {
      const uuid = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
      storageService.savePdfs([
        { id: uuid, shortCode: 'pdf-1', originalName: 'doc.pdf', sizeBytes: 200, pageCount: 2, isScanned: false, url: '', createdAt: '' },
      ]);
      vi.spyOn(apiClient, 'delete').mockRejectedValue({ status: 404, message: 'PDF no encontrado' });

      await pdfsService.deletePdf(uuid);
      expect(storageService.getPdfs()).toHaveLength(0);
    });
  });
});
