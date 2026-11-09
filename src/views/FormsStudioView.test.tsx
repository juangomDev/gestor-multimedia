import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FormsStudioView } from './FormsStudioView';
import { formsService } from '../services/formsService';
import { foldersService } from '../services/foldersService';
import type { FormDefinition, FormEntry } from '../types/forms';

vi.mock('../services/formsService', () => ({
  formsService: {
    listForms: vi.fn(),
    listEntries: vi.fn(),
    createForm: vi.fn(),
    resolveEntry: vi.fn(),
    dispatchEntry: vi.fn(),
    getExportUrl: vi.fn(() => 'http://localhost:3000/export.xlsx'),
  },
}));

vi.mock('../services/foldersService', () => ({
  foldersService: {
    fetchFolders: vi.fn(),
  },
}));

describe('FormsStudioView', () => {
  const mockForms: FormDefinition[] = [
    {
      id: 'f-1',
      slug: 'denuncias',
      title: 'Canal de Denuncias',
      entriesCount: 3,
      entryFieldsSchema: [{ name: 'asunto', label: 'Asunto', type: 'string' }],
      resolutionFieldsSchema: [{ name: 'resolucion', label: 'Resolución', type: 'string' }],
      allowedResolutionStates: ['VALID', 'INVALID'],
      createdAt: '2026-03-01T00:00:00Z',
    },
  ];

  const mockEntries: FormEntry[] = [
    {
      id: 'entry-99',
      formId: 'f-1',
      status: 'NEW',
      entryPayload: { asunto: 'Falla de alumbrado' },
      createdAt: '2026-03-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(formsService.listForms).mockResolvedValue(mockForms);
    vi.mocked(formsService.listEntries).mockResolvedValue({
      entries: mockEntries,
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    vi.mocked(foldersService.fetchFolders).mockResolvedValue([]);
  });

  it('debe cargar y renderizar la lista de formularios y las entradas asociadas', async () => {
    render(<FormsStudioView />);

    await waitFor(() => {
      expect(screen.getByText('Estudio de Formularios & Tablas Abiertas')).toBeInTheDocument();
      expect(screen.getByText('Canal de Denuncias')).toBeInTheDocument();
      expect(screen.getByText('Bandeja de Entradas: Canal de Denuncias')).toBeInTheDocument();
      expect(screen.getByText(/Falla de alumbrado/i)).toBeInTheDocument();
      expect(screen.getByText('Nuevo / Pendiente')).toBeInTheDocument();
    });
  });

  it('debe abrir el modal de dictaminar al hacer click en el botón de la fila', async () => {
    render(<FormsStudioView />);

    await waitFor(() => {
      expect(screen.getByText('Dictaminar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dictaminar'));

    expect(screen.getByText(/Resolución de Entrada #entry-99/i)).toBeInTheDocument();
  });
});
