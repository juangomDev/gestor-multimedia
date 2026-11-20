import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { tablesService } from '../../services/tablesService';
import { storageService } from '../../services/storageService';
import { DataStudioPage } from './DataStudioPage';
import type { PaginatedTableResponse } from '../../types/api';

const PAGE_1_FIXTURE: PaginatedTableResponse = {
  id: 'tbl-uuid-1',
  shortCode: 'tbl01',
  tableName: 'presupuesto-2026.json',
  columns: ['region', 'ingresos', 'estado'],
  headers: [
    ['Ubicación', 'Métricas Q1', 'Métricas Q1'],
    ['region', 'ingresos', 'estado'],
  ],
  merges: ['B1:C1'],
  cellStyles: {
    '0': { ingresos: { bold: true, align: 'right' } },
  },
  metadataCard: {
    title: 'Presupuesto Regional',
    description: 'Consolidado financiero trimestral',
    tags: ['finanzas'],
    unit: 'USD',
    columnsMeta: { ingresos: 'Monto bruto facturado' },
    hasSummaryRows: false,
  },
  data: [
    { region: 'Norte', ingresos: 1500, estado: 'ACTIVE' },
    { region: 'Sur', ingresos: 980, estado: 'PENDING' },
  ],
  meta: { page: 1, limit: 50, total: 75, totalPages: 2, hasNext: true },
};

function renderDataStudio() {
  const user = { id: 'u-admin', username: 'admin', role: 'ADMIN' as const, isActive: true };
  storageService.saveSession({ token: 'jwt-admin', user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  const queryClient = createAppQueryClient();

  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/tables/tbl01',
            state: { folderId: 'fld-tbls', folderName: 'Finanzas', tableId: 'tbl-uuid-1', canEdit: true },
          },
        ]}
      >
        <Routes>
          <Route path="/tables/:shortCode" element={<DataStudioPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>
  );
}

describe('DataStudioPage, DataGrid y TableMetadataDialog (Fase 5.2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
  });

  it('renderiza headers multinivel, merges, cellStyles, filtro y paginación server-side', async () => {
    const fetchSpy = vi
      .spyOn(tablesService, 'fetchTableDetails')
      .mockResolvedValueOnce(PAGE_1_FIXTURE)
      .mockResolvedValueOnce({
        ...PAGE_1_FIXTURE,
        data: [{ region: 'Este', ingresos: 420, estado: 'ACTIVE' }],
        meta: { page: 2, limit: 50, total: 75, totalPages: 2, hasNext: false },
      });

    renderDataStudio();

    expect(await screen.findByText('presupuesto-2026.json')).toBeInTheDocument();
    expect(screen.getByTestId('multi-header-row-0')).toBeInTheDocument();
    expect(screen.getByText('Métricas Q1')).toHaveAttribute('colspan', '2');
    expect(screen.getByTestId('merges-indicator')).toHaveTextContent('B1:C1');

    const styledCell = screen.getByText('1500').closest('td');
    expect(styledCell).toHaveStyle({ fontWeight: '700', textAlign: 'right' });

    // Filtro local con useDeferredValue: la fila 'Sur' (índice original 1) NO debe heredar cellStyles de la fila 0
    fireEvent.change(screen.getByLabelText('Filtrar filas del dataset'), {
      target: { value: 'Sur' },
    });
    await waitFor(() => {
      expect(screen.queryByText('Norte')).not.toBeInTheDocument();
      expect(screen.getByText('Sur')).toBeInTheDocument();
    });
    const surAmountCell = screen.getByText('980').closest('td');
    expect(surAmountCell?.style.fontWeight).not.toBe('700');

    // Limpiar y avanzar a página 2 (server-side)
    fireEvent.change(screen.getByLabelText('Filtrar filas del dataset'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('tbl01', 2, 50);
    });
    expect(await screen.findByText('Este')).toBeInTheDocument();
  });

  it('guarda la Ficha Técnica completa vía TableMetadataDialog (PATCH /api/v1/tables/:id/metadata)', async () => {
    vi.spyOn(tablesService, 'fetchTableDetails').mockResolvedValue(PAGE_1_FIXTURE);
    const updateMetaSpy = vi.spyOn(tablesService, 'updateTableMetadata').mockResolvedValue({
      id: 'tbl-uuid-1',
      shortCode: 'tbl01',
      tableName: 'presupuesto-2026.json',
      rowCount: 75,
      sizeBytes: 4096,
      url: 'http://localhost:3000/t/tbl01',
      createdAt: '2026-11-19T10:00:00Z',
    });

    renderDataStudio();
    fireEvent.click(await screen.findByTestId('open-table-metadata-btn'));

    fireEvent.change(await screen.findByLabelText('Título descriptivo'), {
      target: { value: 'Presupuesto Auditado 2026' },
    });
    fireEvent.change(screen.getByLabelText('Nueva etiqueta temática'), {
      target: { value: 'auditoria' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByTestId('table-metadata-save-btn'));

    await waitFor(() => {
      expect(updateMetaSpy).toHaveBeenCalledWith(
        'tbl-uuid-1',
        expect.objectContaining({
          title: 'Presupuesto Auditado 2026',
          tags: ['finanzas', 'auditoria'],
          hasSummaryRows: true,
        })
      );
    });
  });

  it('soporta Hot-Swap con archivo .json (Fase 21) desde DataStudioPage', async () => {
    vi.spyOn(tablesService, 'fetchTableDetails').mockResolvedValue(PAGE_1_FIXTURE);
    const hotSwapSpy = vi.spyOn(tablesService, 'hotSwapTable').mockResolvedValue({
      id: 'tbl-uuid-1',
      shortCode: 'tbl01',
      tableName: 'actualizado.json',
      rowCount: 80,
      sizeBytes: 5120,
      url: 'http://localhost:3000/t/tbl01',
      createdAt: '2026-11-19T10:00:00Z',
    });

    renderDataStudio();
    fireEvent.click(await screen.findByTestId('open-table-hotswap-btn'));

    const jsonFile = new File(['[{"region":"Oeste","ingresos":700}]'], 'actualizado.json', {
      type: 'application/json',
    });
    fireEvent.change(await screen.findByTestId('hotswap-file-input'), {
      target: { files: [jsonFile] },
    });
    fireEvent.click(screen.getByTestId('hotswap-confirm-btn'));

    await waitFor(() => {
      expect(hotSwapSpy).toHaveBeenCalledWith('tbl-uuid-1', jsonFile);
    });
  });
});
