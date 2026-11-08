import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogsView } from './AuditLogsView';
import { auditService } from '../services/auditService';
import { ToastProvider } from '../context/ToastContext';

describe('AuditLogsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockLogs = {
    logs: [
      {
        id: 'log-1',
        action: 'CREATE',
        resourceType: 'IMAGE',
        resourceId: 'img-101',
        actorId: 'usr-1',
        actorUsername: 'alice',
        actorRole: 'MANAGER',
        ipAddress: '192.168.1.10',
        folderId: null,
        metadata: { filename: 'hero.png', sizeBytes: 1024 },
        createdAt: '2026-11-08T12:00:00Z',
      },
      {
        id: 'log-2',
        action: 'DELETE',
        resourceType: 'TABLE',
        resourceId: 'tbl-202',
        actorId: 'usr-2',
        actorUsername: 'bob',
        actorRole: 'ADMIN',
        ipAddress: '10.0.0.5',
        folderId: 'fld-1',
        metadata: { tableName: 'Precios 2026' },
        createdAt: '2026-11-08T13:00:00Z',
      },
    ],
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  it('renderiza la lista de registros de auditoría y permite abrir el modal de detalle', async () => {
    vi.spyOn(auditService, 'fetchAuditLogs').mockResolvedValue(mockLogs);
    const onBackToGallery = vi.fn();

    render(
      <ToastProvider>
        <AuditLogsView onBackToGallery={onBackToGallery} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
    });

    // Validar visualización de acciones
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();

    // Clic en Volver
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBackToGallery).toHaveBeenCalledTimes(1);

    // Clic en Ver detalles del primer registro
    fireEvent.click(screen.getByRole('button', { name: /Ver detalles de CREATE/i }));

    // Modal de detalle abierto
    expect(screen.getByText(/Detalles de Auditoría/i)).toBeInTheDocument();
    expect(screen.getByText('METADATOS DEL EVENTO (JSON)')).toBeInTheDocument();

    // Cerrar modal
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar modal' }));
    await waitFor(() => {
      expect(screen.queryByText(/Detalles de Auditoría/i)).not.toBeInTheDocument();
    });
  });

  it('permite cambiar los filtros de acción y tipo de recurso', async () => {
    const fetchSpy = vi.spyOn(auditService, 'fetchAuditLogs').mockResolvedValue(mockLogs);

    render(
      <ToastProvider>
        <AuditLogsView onBackToGallery={vi.fn()} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    const actionSelect = screen.getByLabelText('Filtrar por acción');
    fireEvent.change(actionSelect, { target: { value: 'IMAGE_DELETE' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'IMAGE_DELETE' })
      );
    });
  });
});
