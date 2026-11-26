import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { auditService } from '../../services/auditService';
import { apiKeysService } from '../../services/apiKeysService';
import { storageStatsService } from '../../services/storageStatsService';
import { notificationsService } from '../../services/notificationsService';
import { storageService } from '../../services/storageService';
import { ShellContext, type ShellContextValue } from '../shell/shellContextDef';
import { AdminPage } from './AdminPage';

function renderAdminGovernance(initialRoute: string) {
  const user = { id: 'u-admin', username: 'admin', role: 'ADMIN' as const, isActive: true };
  storageService.saveSession({ token: 'jwt-admin', user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(0);

  const shellValue: ShellContextValue = {
    activeFolder: null,
    allFolders: [],
    isCommandPaletteOpen: false,
    openCommandPalette: vi.fn(),
    closeCommandPalette: vi.fn(),
    openChangePassword: vi.fn(),
    triggerContextualUpload: vi.fn(),
    registerUploadHandler: () => () => undefined,
    openShortCodePreview: vi.fn(),
    closeShortCodePreview: vi.fn(),
    activePreview: null,
  };

  return render(
    <AppProviders queryClient={createAppQueryClient()}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ShellContext.Provider value={shellValue}>
          <Routes>
            <Route path="/admin/*" element={<AdminPage />} />
          </Routes>
        </ShellContext.Provider>
      </MemoryRouter>
    </AppProviders>
  );
}

describe('Admin Governance — Exportación Auditoría, Edición API Keys y Cuota Storage (Ola 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  it('/admin/audit filtra por search y rango from/to y exporta en .csv y .xlsx con los filtros activos', async () => {
    const fetchSpy = vi.spyOn(auditService, 'fetchAuditLogs').mockResolvedValue({
      logs: [
        {
          id: 'aud-9',
          actorUsername: 'admin',
          action: 'FORM_DELETE',
          resourceType: 'FORM',
          resourceId: 'frm-12345678',
          createdAt: '2026-11-20T10:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 25,
      totalPages: 1,
    });
    const exportSpy = vi.spyOn(auditService, 'downloadExport').mockResolvedValue({
      blob: new Blob(['csv']),
      filename: 'auditoria.csv',
      contentType: 'text/csv',
      sizeBytes: 3,
    });

    renderAdminGovernance('/admin/audit');
    await screen.findByTestId('audit-logs-table');

    fireEvent.change(screen.getByTestId('audit-search-input'), { target: { value: 'frm-123' } });
    fireEvent.change(screen.getByTestId('audit-from-input'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByTestId('audit-to-input'), { target: { value: '2026-11-25' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'frm-123',
          from: '2026-11-01T00:00:00.000Z',
          to: '2026-11-25T23:59:59.999Z',
          page: 1,
        })
      );
    });

    fireEvent.click(screen.getByTestId('audit-export-csv-btn'));
    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalledWith(
        'csv',
        expect.objectContaining({
          search: 'frm-123',
          from: '2026-11-01T00:00:00.000Z',
          to: '2026-11-25T23:59:59.999Z',
        })
      );
    });

    fireEvent.click(screen.getByTestId('audit-export-xlsx-btn'));
    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalledWith('xlsx', expect.objectContaining({ search: 'frm-123' }));
    });

    fireEvent.click(screen.getByTestId('audit-clear-filters-btn'));
    expect(screen.getByTestId('audit-search-input')).toHaveValue('');
  });

  it('/admin/api-keys pausa/reactiva en línea y edita nombre, descripción y rateLimit con PATCH /api/v1/api-keys/:id', async () => {
    const keyFixture = {
      id: 'key-1',
      name: 'Pipeline BI',
      description: 'Sincronización nocturna',
      keyPrefix: 'mk_live_9a2f',
      rateLimit: 240,
      isActive: true,
      lastUsedAt: null,
      createdAt: '2026-11-01T08:00:00Z',
    };
    vi.spyOn(apiKeysService, 'listApiKeys')
      .mockResolvedValueOnce([keyFixture])
      .mockResolvedValue([{ ...keyFixture, isActive: false }]);
    const updateSpy = vi
      .spyOn(apiKeysService, 'updateApiKey')
      .mockResolvedValueOnce({ ...keyFixture, isActive: false })
      .mockResolvedValueOnce({
        ...keyFixture,
        name: 'Pipeline BI v2',
        description: null,
        rateLimit: 500,
        isActive: false,
      });

    renderAdminGovernance('/admin/api-keys');
    expect(await screen.findByText('Pipeline BI')).toBeInTheDocument();

    // Pausa rápida inline
    fireEvent.click(screen.getByLabelText('Estado activo de Pipeline BI'));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('key-1', { isActive: false });
      expect(screen.getByText('Pausada')).toBeInTheDocument();
    });

    // Edición completa en diálogo
    fireEvent.click(screen.getByTestId('edit-apikey-btn-key-1'));
    fireEvent.change(await screen.findByLabelText('Nombre descriptivo'), {
      target: { value: 'Pipeline BI v2' },
    });
    fireEvent.change(screen.getByLabelText('Descripción (opcional)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Límite por minuto (req/min)'), {
      target: { value: '500' },
    });
    fireEvent.click(screen.getByTestId('edit-apikey-submit-btn'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenLastCalledWith('key-1', {
        name: 'Pipeline BI v2',
        description: null,
        rateLimit: 500,
        isActive: false,
      });
    });
  });

  it('/admin/storage muestra medidor de cuota usagePercent/maxStorageBytes y resumen operativo summary', async () => {
    vi.spyOn(storageStatsService, 'fetchStorageStats').mockResolvedValue({
      isAdmin: true,
      database: {
        images: { count: 10, sizeBytes: 1_000_000 },
        tables: { count: 4, sizeBytes: 500_000 },
        pdfs: { count: 2, sizeBytes: 500_000 },
        totalCount: 16,
        totalSizeBytes: 2_000_000,
      },
      disk: {
        totalBytes: 825_000_000,
        totalFilesCount: 55,
        maxStorageBytes: 1_000_000_000,
        usagePercent: 82.5,
      },
      summary: {
        activeUsersCount: 14,
        formsCount: 6,
        pendingEntriesCount: 9,
        resolvedEntriesCount: 41,
      },
      topFolders: [],
      warning: true,
      warningMessage: 'Capacidad por encima del 80%',
    });

    renderAdminGovernance('/admin/storage');

    const meter = await screen.findByTestId('storage-disk-quota-meter');
    expect(meter).toHaveTextContent('82.5%');
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '82.5');

    const summary = screen.getByTestId('storage-operational-summary');
    expect(summary).toHaveTextContent('14');
    expect(summary).toHaveTextContent('6');
    expect(summary).toHaveTextContent('9');
    expect(summary).toHaveTextContent('41');
  });
});
