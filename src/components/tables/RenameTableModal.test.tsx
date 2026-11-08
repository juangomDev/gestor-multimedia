import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RenameTableModal } from './RenameTableModal';
import { tablesService } from '../../services/tablesService';
import { ToastProvider } from '../../context/ToastContext';
import type { TableItem } from '../../types/media';

const mockTable: TableItem = {
  id: 'tbl-rename-1',
  shortCode: 'tab123',
  tableName: 'balance_actual.xlsx',
  rowCount: 100,
  sizeBytes: 4096,
  url: 'http://localhost:3000/t/tab123',
  createdAt: '2026-11-01T00:00:00Z',
};

const renderModal = (props: {
  table?: TableItem | null;
  isOpen?: boolean;
  onClose?: () => void;
  onTableRenamed?: (t: TableItem) => void;
} = {}) => {
  return render(
    <ToastProvider>
      <RenameTableModal
        table={props.table !== undefined ? props.table : mockTable}
        isOpen={props.isOpen ?? true}
        onClose={props.onClose || vi.fn()}
        onTableRenamed={props.onTableRenamed}
      />
    </ToastProvider>
  );
};

describe('RenameTableModal Component (Módulo 19)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders modal with shortCode and input pre-filled with current tableName', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: /Renombrar Dataset/i })).toBeInTheDocument();
    expect(screen.getByText('tab123')).toBeInTheDocument();
    const input = screen.getByLabelText(/Nombre del Archivo Tabular/i) as HTMLInputElement;
    expect(input.value).toBe('balance_actual.xlsx');
  });

  it('submits updated tableName, calls tablesService.renameTable and triggers onTableRenamed and onClose', async () => {
    const onTableRenamed = vi.fn();
    const onClose = vi.fn();

    const renameSpy = vi.spyOn(tablesService, 'renameTable').mockResolvedValue({
      ...mockTable,
      tableName: 'balance_final_2026.xlsx',
    });

    renderModal({ onTableRenamed, onClose });

    const input = screen.getByLabelText(/Nombre del Archivo Tabular/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'balance_final_2026.xlsx' } });
      fireEvent.click(screen.getByRole('button', { name: /Guardar Nombre/i }));
    });

    expect(renameSpy).toHaveBeenCalledWith('tbl-rename-1', 'balance_final_2026.xlsx');
    expect(onTableRenamed).toHaveBeenCalledWith(
      expect.objectContaining({ tableName: 'balance_final_2026.xlsx' })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('does nothing and closes when submitting the exact same name', async () => {
    const onClose = vi.fn();
    const renameSpy = vi.spyOn(tablesService, 'renameTable');

    renderModal({ onClose });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Nombre/i }));
    });

    expect(renameSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

