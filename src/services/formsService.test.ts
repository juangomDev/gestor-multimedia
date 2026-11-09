import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formsService } from './formsService';
import { apiClient } from './apiClient';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('./storageService', () => ({
  storageService: {
    getConfig: vi.fn(() => ({ baseUrl: 'http://localhost:3000' })),
  },
}));

describe('formsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listForms', () => {
    it('debe retornar la lista directa de formularios si el endpoint responde un arreglo', async () => {
      const mockForms = [
        {
          id: 'form-1',
          slug: 'registro-clientes',
          title: 'Registro de Clientes',
          entryFieldsSchema: [],
          resolutionFieldsSchema: [],
          allowedResolutionStates: ['VALID'],
          createdAt: '2026-03-01T00:00:00Z',
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockForms);

      const result = await formsService.listForms();
      expect(result).toEqual(mockForms);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/forms');
    });

    it('debe retornar data o forms si la respuesta viene envuelta en un objeto', async () => {
      const mockForms = [
        {
          id: 'form-2',
          slug: 'consulta-tramite',
          title: 'Consulta Trámite',
          entryFieldsSchema: [],
          resolutionFieldsSchema: [],
          allowedResolutionStates: ['VALID', 'INVALID'],
          createdAt: '2026-03-01T00:00:00Z',
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockForms });

      const result = await formsService.listForms();
      expect(result).toEqual(mockForms);
    });

    it('debe retornar un arreglo vacío si el backend responde 404 Not Found', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('404 Not Found'));

      const result = await formsService.listForms();
      expect(result).toEqual([]);
    });
  });

  describe('getForm', () => {
    it('debe obtener el formulario por id o slug desenvolviendo data', async () => {
      const mockForm = {
        id: 'f-1',
        slug: 'peticiones',
        title: 'Peticiones',
        entryFieldsSchema: [],
        resolutionFieldsSchema: [],
        allowedResolutionStates: ['VALID'],
        createdAt: '2026-03-01T00:00:00Z',
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockForm });

      const result = await formsService.getForm('peticiones');
      expect(result).toEqual(mockForm);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/forms/peticiones');
    });
  });

  describe('createForm', () => {
    it('debe enviar la definición del formulario con valores por defecto', async () => {
      const input = {
        slug: 'soporte-tecnico',
        title: 'Soporte Técnico',
        entryFieldsSchema: [{ name: 'asunto', type: 'string' as const, label: 'Asunto', required: true }],
        resolutionFieldsSchema: [{ name: 'solucion', type: 'string' as const, label: 'Solución' }],
      };
      const created = { id: 'f-new', ...input, allowedResolutionStates: ['VALID', 'INVALID'], createdAt: '2026-03-01T00:00:00Z' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: created });

      const result = await formsService.createForm(input);
      expect(result).toEqual(created);
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/forms', {
        ...input,
        allowedResolutionStates: ['VALID', 'INVALID'],
      });
    });
  });

  describe('listEntries', () => {
    it('debe construir la query string con filtros y retornar las entradas', async () => {
      const mockEntries = [
        {
          id: 'e-1',
          formId: 'f-1',
          status: 'NEW' as const,
          entryPayload: { nombre: 'Juan' },
          createdAt: '2026-03-01T10:00:00Z',
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        entries: mockEntries,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const res = await formsService.listEntries('f-1', {
        month: '2026-03',
        status: 'NEW',
        page: 1,
        limit: 20,
      });

      expect(res.entries).toEqual(mockEntries);
      expect(res.total).toBe(1);
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/v1/forms/f-1/entries?month=2026-03&status=NEW&page=1&limit=20'
      );
    });

    it('debe manejar 404 devolviendo estructura vacía', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Endpoint not found'));

      const res = await formsService.listEntries('f-unknown');
      expect(res.entries).toEqual([]);
      expect(res.total).toBe(0);
    });
  });

  describe('resolveEntry & dispatchEntry', () => {
    it('debe llamar a PATCH /api/v1/forms/entries/:id/resolve con resolutionPayload y status', async () => {
      const resolved = {
        id: 'e-1',
        formId: 'f-1',
        status: 'VALID' as const,
        entryPayload: { nombre: 'Juan' },
        resolutionPayload: { dictamen: 'Aprobado' },
        resolvedAt: '2026-03-01T12:00:00Z',
        createdAt: '2026-03-01T10:00:00Z',
      };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: resolved });

      const res = await formsService.resolveEntry('e-1', {
        resolutionPayload: { dictamen: 'Aprobado' },
        status: 'VALID',
      });

      expect(res).toEqual(resolved);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/forms/entries/e-1/resolve', {
        resolutionPayload: { dictamen: 'Aprobado' },
        status: 'VALID',
      });
    });

    it('debe llamar a POST /api/v1/forms/entries/:id/dispatch', async () => {
      const dispatchResponse = {
        dispatched: true,
        targetUrl: 'https://webhook.org/test',
        entryId: 'e-1',
        dispatchedAt: '2026-03-01T12:05:00Z',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: dispatchResponse });

      const res = await formsService.dispatchEntry('e-1');
      expect(res).toEqual(dispatchResponse);
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/forms/entries/e-1/dispatch', {});
    });
  });

  describe('getExportUrl & submitPublicEntry', () => {
    it('debe generar la URL de exportación con parámetros correctos', () => {
      const url = formsService.getExportUrl('f-1', 'xlsx', { month: '2026-03', status: 'VALID' });
      expect(url).toBe('http://localhost:3000/api/v1/forms/f-1/export?format=xlsx&month=2026-03&status=VALID');
    });

    it('debe enviar la entrada pública a /api/v1/public/forms/:slug/entries', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ id: 'pub-1', status: 'NEW', createdAt: '2026-03-01' });

      const res = await formsService.submitPublicEntry('reclamos', { detalle: 'Consulta' });
      expect(res.id).toBe('pub-1');
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/public/forms/reclamos/entries', {
        detalle: 'Consulta',
      });
    });
  });
});

