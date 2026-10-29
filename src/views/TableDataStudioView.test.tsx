import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TableDataStudioView } from './TableDataStudioView';
import { tablesService } from '../services/tablesService';
import { ToastProvider } from '../context/ToastContext';
import type { TableItem } from '../types/media';

const mockTable: TableItem = {
  id: 't-1',
  shortCode: 'abc12345',
  tableName: 'metricas_2026.csv',
  rowCount: 2,
  columns: ['id_indicador', 'region', 'estado'],
  sizeBytes: 1024,
  url: 'http://localhost:3000/t/abc12345',
  createdAt: '2026-10-28T18:00:00Z',
  demoRows: [
    { id_indicador: 'ODS-01', region: 'Norte', estado: 'ACTIVE' },
    { id_indicador: 'ODS-04', region: 'Sur', estado: 'PENDING' },
  ],
};

describe('TableDataStudioView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders data studio header, row badges, and table rows', async () => {
    vi.spyOn(tablesService, 'getTableData').mockResolvedValue({
      data: mockTable.demoRows!,
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
          <TableDataStudioView table={mockTable} onBack={vi.fn()} />
        </ToastProvider>
      );
    });

    expect(screen.getByText('metricas_2026.csv')).toBeInTheDocument();
    expect(screen.getByText('2 Filas')).toBeInTheDocument();
    expect(screen.getByText('ODS-01')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('ODS-04')).toBeInTheDocument();
  });
});
