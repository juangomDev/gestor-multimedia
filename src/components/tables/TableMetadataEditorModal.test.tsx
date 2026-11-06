import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../../context/ToastContext';
import { TableMetadataEditorModal } from './TableMetadataEditorModal';
import { tablesService } from '../../services/tablesService';
import type { TableItem } from '../../types/media';

const mockTable: TableItem = {
  id: 'tab-edit-meta',
  shortCode: 'edt123',
  tableName: 'exportaciones.csv',
  rowCount: 85,
  columns: ['pais', 'volumen'],
  sizeBytes: 2048,
  url: 'http://localhost:3000/t/edt123',
  createdAt: '2026-10-30T10:00:00Z',
  metadataCard: {
    title: 'Exportaciones Iniciales',
    description: 'Reporte preliminar',
    tags: ['comercio'],
    unit: 'toneladas',
    columnsMeta: {
      pais: 'País destino',
    },
    hasSummaryRows: false,
  },
};

describe('TableMetadataEditorModal Component (15.2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('edits title, description, unit, interactive tag chips, column glossary and summary toggle', async () => {
    const updateSpy = vi.spyOn(tablesService, 'updateTableMetadata').mockImplementation(
      async (_id, meta) => ({
        ...mockTable,
        metadataCard: meta,
      })
    );
    const onClose = vi.fn();
    const onMetadataSaved = vi.fn();

    render(
      <ToastProvider>
        <TableMetadataEditorModal
          table={mockTable}
          isOpen={true}
          onClose={onClose}
          onMetadataSaved={onMetadataSaved}
        />
      </ToastProvider>
    );

    const titleInput = screen.getByLabelText(/Título Descriptivo/i) as HTMLInputElement;
    const unitInput = screen.getByLabelText(/Unidad de Medida/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/Descripción del Dataset/i) as HTMLTextAreaElement;

    expect(titleInput.value).toBe('Exportaciones Iniciales');
    expect(unitInput.value).toBe('toneladas');
    expect(screen.getByText('#comercio')).toBeInTheDocument();

    // Add a new tag chip
    const tagInput = screen.getByLabelText(/Etiquetas Temáticas/i);
    await act(async () => {
      fireEvent.change(tagInput, { target: { value: 'aduana' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));
    });
    expect(screen.getByText('#aduana')).toBeInTheDocument();

    // Edit title, description, column glossary, and summary toggle
    await act(async () => {
      fireEvent.change(titleInput, { target: { value: 'Exportaciones Agrícolas 2026' } });
      fireEvent.change(descInput, { target: { value: 'Volumen anual consolidado' } });
      fireEvent.change(screen.getByLabelText(/Significado de columna volumen/i), {
        target: { value: 'Toneladas métricas exportadas' },
      });
      fireEvent.click(screen.getByRole('checkbox'));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Ficha Técnica/i }));
    });

    expect(updateSpy).toHaveBeenCalledWith('tab-edit-meta', {
      title: 'Exportaciones Agrícolas 2026',
      description: 'Volumen anual consolidado',
      tags: ['comercio', 'aduana'],
      unit: 'toneladas',
      columnsMeta: {
        pais: 'País destino',
        volumen: 'Toneladas métricas exportadas',
      },
      hasSummaryRows: true,
    });
    expect(onMetadataSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

