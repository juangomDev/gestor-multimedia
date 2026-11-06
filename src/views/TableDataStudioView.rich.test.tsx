import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../context/ToastContext';
import { TableDataStudioView } from './TableDataStudioView';
import { TablesCatalogView } from './TablesCatalogView';
import { tablesService } from '../services/tablesService';
import type { TableItem } from '../types/media';

const mockRichTable: TableItem = {
  id: 't-rich-99',
  shortCode: 'rich99',
  tableName: 'balance_anual.xlsx',
  rowCount: 2,
  columns: ['concepto', 'q1', 'q2'],
  sizeBytes: 4096,
  url: 'http://localhost:3000/t/rich99',
  createdAt: '2026-10-30T10:00:00Z',
  metadataCard: {
    title: 'Balance Consolidado 2026',
    description: 'Cifras auditadas por trimestre',
    unit: 'USD',
    tags: ['finanzas', 'balance'],
    hasSummaryRows: true,
  },
};

describe('Module 15 — Rich Data Studio & Tables Catalog Metadata/Pagination', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders multi-level headers, merges indicator, and dynamic cellStyles in DataGrid', async () => {
    vi.spyOn(tablesService, 'getTableData').mockResolvedValue({
      data: [
        { concepto: 'Ventas', q1: 12000, q2: 15000 },
        { concepto: 'Total', q1: 12000, q2: 15000 },
      ],
      headers: [
        ['Rubro', 'Resultados Trimestrales', 'Resultados Trimestrales'],
        ['concepto', 'q1', 'q2'],
      ],
      merges: ['B1:C1'],
      cellStyles: {
        '1': {
          concepto: { bg: '#fef3c7', bold: true },
          q1: { bg: '#fef3c7', bold: true, align: 'right' },
        },
      },
      meta: {
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
        hasNext: false,
      },
    });

    await act(async () => {
      render(
        <ToastProvider>
          <TableDataStudioView table={mockRichTable} onBack={vi.fn()} />
        </ToastProvider>
      );
    });

    // Multi-level header & colSpan
    expect(screen.getByTestId('multi-header-row-0')).toBeInTheDocument();
    const mergedHeader = screen.getByText('Resultados Trimestrales').closest('th');
    expect(mergedHeader).toHaveAttribute('colSpan', '2');

    // Merges indicator
    expect(screen.getByTestId('merges-indicator')).toHaveTextContent('B1:C1');

    // Dynamic cellStyles applied to row 1 ('Total')
    const styledCell = screen.getByTestId('cell-1-q1');
    expect(styledCell).toHaveStyle({
      backgroundColor: '#fef3c7',
      fontWeight: '700',
      textAlign: 'right',
    });

    // Opens Ficha Técnica modal from Data Studio top bar
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ficha Técnica/i }));
    });
    expect(screen.getByLabelText(/Título Descriptivo/i)).toHaveValue('Balance Consolidado 2026');
  });

  it('renders read-only metadataCard badge with tooltip in TableCard and supports catalog pagination', async () => {
    const items: TableItem[] = Array.from({ length: 4 }, (_, i) => ({
      ...mockRichTable,
      id: `t-${i + 1}`,
      shortCode: `sc-t-${i + 1}`,
      tableName: `dataset_${i + 1}.csv`,
      folderId: 'folder-datos',
    }));

    const fetchSpy = vi.spyOn(tablesService, 'fetchRemoteTables').mockResolvedValue(items);

    render(
      <ToastProvider>
        <TablesCatalogView
          tables={items}
          activeFolder={{
            id: 'folder-datos',
            name: 'Datos Abiertos',
            type: 'table',
            createdAt: '2026-10-30T00:00:00Z',
          }}
          searchQuery=""
          onOpenStudio={vi.fn()}
          onOpenUpload={vi.fn()}
          onDeleteTable={vi.fn()}
          pageLimit={2}
        />
      </ToastProvider>
    );

    // 15.2.4 Read-only badge with tooltip on TableCard
    const badge = screen.getByTestId('metadata-badge-sc-t-1');
    expect(badge).toHaveTextContent('Balance Consolidado 2026');
    expect(badge).toHaveTextContent('(USD)');
    expect(badge.getAttribute('title')).toContain('Cifras auditadas por trimestre');

    // 15.3.1 Pagination call & controls
    expect(fetchSpy).toHaveBeenCalledWith({
      page: 1,
      limit: 2,
      folderId: 'folder-datos',
    });
    expect(screen.getByTestId('tables-pagination')).toBeInTheDocument();
    expect(screen.getByText(/Página 1 de 2/i)).toBeInTheDocument();

    // Navigate to Page 2
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Página siguiente/i }));
    });

    expect(screen.getByText(/Página 2 de 2/i)).toBeInTheDocument();
    expect(screen.getByText('dataset_3.csv')).toBeInTheDocument();
  });
});

