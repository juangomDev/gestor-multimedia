import { describe, it, expect, vi, beforeEach } from 'vitest';
import { imagesService } from './imagesService';
import { tablesService } from './tablesService';
import { pdfsService } from './pdfsService';
import { apiClient, ApiError } from './apiClient';

describe('Media Deletion Endpoints (v2 Stateless Propagation)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('imagesService.deleteImage llama a DELETE /api/v1/images/:id y propaga errores HTTP', async () => {
    const uuid = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce(undefined);

    await imagesService.deleteImage(uuid);
    expect(deleteSpy).toHaveBeenCalledWith(`/api/v1/images/${uuid}`);

    vi.spyOn(apiClient, 'delete').mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Sin permisos'));
    await expect(imagesService.deleteImage(uuid)).rejects.toThrow('Sin permisos');
  });

  it('tablesService.deleteTable llama a DELETE /api/v1/tables/:id y propaga errores HTTP', async () => {
    const uuid = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce(undefined);

    await tablesService.deleteTable(uuid);
    expect(deleteSpy).toHaveBeenCalledWith(`/api/v1/tables/${uuid}`);

    vi.spyOn(apiClient, 'delete').mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'No existe'));
    await expect(tablesService.deleteTable(uuid)).rejects.toThrow('No existe');
  });

  it('pdfsService.deletePdf llama a DELETE /api/v1/pdfs/:id y propaga errores HTTP', async () => {
    const uuid = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce(undefined);

    await pdfsService.deletePdf(uuid);
    expect(deleteSpy).toHaveBeenCalledWith(`/api/v1/pdfs/${uuid}`);

    vi.spyOn(apiClient, 'delete').mockRejectedValueOnce(new ApiError(500, 'SERVER_ERROR', 'Fallo disco'));
    await expect(pdfsService.deletePdf(uuid)).rejects.toThrow('Fallo disco');
  });
});
