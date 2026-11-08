import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HotSwapTableModal } from './HotSwapTableModal';
import { tablesService } from '../../services/tablesService';
import { ToastProvider } from '../../context/ToastContext';
import type { TableItem } from '../../types/media';

const mockTable: TableItem = {
  id: 'tbl-hotswap-1',
  shortCode: 'tabHot99',
  tableName: 'datos_v1.csv',
  rowCount: 50,
  sizeBytes: 2048,
  url: 'http://localhost:3000/t/tabHot99',
  createdAt: '2026-11-01T00:00:00Z',
};

const renderModal = (props: {
  table?: TableItem | null;
  isOpen?: boolean;
  onClose?: () => void;
  onTableReplaced?: (t: TableItem) => void;
} = {}) => {
  return render(
    <ToastProvider>
      <HotSwapTableModal
        table={props.table !== undefined ? props.table : mockTable}
        isOpen={props.isOpen ?? true}
        onClose={props.onClose || vi.fn()}
        onTableReplaced={props.onTableReplaced}
      />
    </ToastProvider>
  );
};

describe('HotSwapTableModal Component (Módulo 19)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders modal with current table information, warning banner and dropzone', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: /Reemplazar Dataset en Caliente/i })).toBeInTheDocument();
    expect(screen.getByText('tabHot99')).toBeInTheDocument();
    expect(screen.getByText('datos_v1.csv')).toBeInTheDocument();
    expect(screen.getByText('50 filas')).toBeInTheDocument();
    expect(screen.getByText(/Arrastra o haz clic para subir/i)).toBeInTheDocument();
  });

  it('accepts file upload, calls tablesService.replaceTable and triggers onTableReplaced and onClose', async () => {
    const onTableReplaced = vi.fn();
    const onClose = vi.fn();

    const replaceSpy = vi.spyOn(tablesService, 'replaceTable').mockResolvedValue({
      ...mockTable,
      tableName: 'datos_v2.xlsx',
      rowCount: 120,
      sizeBytes: 10240,
    });

    renderModal({ onTableReplaced, onClose });

    const file = new File(['mock content'], 'datos_v2.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(screen.getByText('datos_v2.xlsx')).toBeInTheDocument();
    expect(screen.getByText(/Listo para sustituir/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Confirmar Reemplazo/i });
    expect(submitBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(replaceSpy).toHaveBeenCalledWith('tbl-hotswap-1', file);
    expect(onTableReplaced).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

