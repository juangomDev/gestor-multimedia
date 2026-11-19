import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { auditService } from '../../services/auditService';
import { apiKeysService } from '../../services/apiKeysService';
import { storageStatsService } from '../../services/storageStatsService';
import { healthService } from '../../services/healthService';
import { notificationsService } from '../../services/notificationsService';
import { storageService } from '../../services/storageService';
import { ShellContext, type ShellContextValue } from '../shell/shellContextDef';
import { AdminPage } from './AdminPage';

function renderAdmin(initialRoute: string, openShortCodePreview = vi.fn()) {
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
    openShortCodePreview,
    closeShortCodePreview: vi.fn(),
    activePreview: null,
  };

  const queryClient = createAppQueryClient();
  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ShellContext.Provider value={shellValue}>
          <Routes>
            <Route path="/admin/*" element={<AdminPage />} />
            <Route
              path="/tables/:shortCode"
              element={<div data-testid="table-preview-route">Data Studio abierto</div>}
            />
          </Routes>
        </ShellContext.Provider>
      </MemoryRouter>
    </AppProviders>
  );
}

describe('AdminPage — Auditoría, API Keys, Almacenamiento y Sistema/API (Fase 7.2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  it('/admin/audit filtra por acción y recurso, pagina server-side e inspecciona detalle JSON', async () => {
    const auditSpy = vi.spyOn(auditService, 'fetchAuditLogs').mockResolvedValue({
      logs: [
        {
          id: 'aud-1',
          actorUsername: 'admin',
          action: 'UPLOAD_TABLE',
          resourceType: 'TABLE',
          resourceId: 'tbl-99887766',
          ipAddress: '10.0.0.5',
          metadata: { filename: 'ventas.json' },
          createdAt: '2026-11-19T12:00:00Z',
        },
      ],
      total: 40,
      page: 1,
      limit: 25,
      totalPages: 2,
    });

    renderAdmin('/admin/audit');

    const auditTable = await screen.findByTestId('audit-logs-table');
    expect(within(auditTable).getByText('UPLOAD_TABLE')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('audit-action-filter'), {
      target: { value: 'UPLOAD_TABLE' },
    });
    fireEvent.change(screen.getByTestId('audit-resource-filter'), {
      target: { value: 'TABLE' },
    });

    await waitFor(() => {
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPLOAD_TABLE', resourceType: 'TABLE', page: 1 })
      );
    });

    fireEvent.click(await screen.findByRole('button', { name: /Siguiente/i }));
    await waitFor(() => {
      expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });

    fireEvent.click(await screen.findByLabelText('Ver detalle del evento aud-1'));
    expect(await screen.findByText(/"ventas\.json"/i)).toBeInTheDocument();
  });

  it('/admin/api-keys emite secreto una sola vez, lista prefijo mk_live_ y revoca clave', async () => {
    vi.spyOn(apiKeysService, 'listApiKeys').mockResolvedValue([
      {
        id: 'key-1',
        name: 'Pipeline BI',
        description: 'Sincronización nocturna',
        keyPrefix: 'mk_live_9a2f',
        rateLimit: 240,
        isActive: true,
        lastUsedAt: '2026-11-19T08:00:00Z',
        createdAt: '2026-11-01T08:00:00Z',
      },
    ]);
    const createSpy = vi.spyOn(apiKeysService, 'createApiKey').mockResolvedValue({
      id: 'key-2',
      name: 'ERP Prod',
      keyPrefix: 'mk_live_7c1d',
      key: 'mk_live_7c1d_SECRET_VALUE_ONCE',
      rateLimit: 120,
      isActive: true,
      createdAt: '2026-11-19T15:00:00Z',
    });
    const deleteSpy = vi.spyOn(apiKeysService, 'deleteApiKey').mockResolvedValue(undefined);

    renderAdmin('/admin/api-keys');

    expect(await screen.findByText('Pipeline BI')).toBeInTheDocument();
    expect(screen.getByText(/mk_live_9a2f/i)).toBeInTheDocument();

    // Emitir nueva clave
    fireEvent.click(screen.getByTestId('open-create-apikey-btn'));
    fireEvent.change(await screen.findByLabelText('Nombre descriptivo'), {
      target: { value: 'ERP Prod' },
    });
    fireEvent.click(screen.getByTestId('create-apikey-submit-btn'));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'ERP Prod' }));
    });
    expect(await screen.findByTestId('issued-apikey-value')).toHaveTextContent(
      'mk_live_7c1d_SECRET_VALUE_ONCE'
    );

    // Revocar clave existente
    fireEvent.click(screen.getByTestId('revoke-apikey-btn-key-1'));
    fireEvent.click(await screen.findByTestId('confirm-revoke-apikey-btn'));
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('key-1');
    });
  });

  it('/admin/storage muestra BD, disco físico, top carpetas y alerta warning: true', async () => {
    vi.spyOn(storageStatsService, 'fetchStorageStats').mockResolvedValue({
      isAdmin: true,
      database: {
        images: { count: 12, sizeBytes: 5_000_000 },
        tables: { count: 5, sizeBytes: 2_000_000 },
        pdfs: { count: 3, sizeBytes: 3_000_000 },
        totalCount: 20,
        totalSizeBytes: 10_000_000,
      },
      disk: {
        imagesBytes: 5_100_000,
        imagesFilesCount: 24,
        tablesBytes: 2_000_000,
        tablesFilesCount: 5,
        pdfsBytes: 3_000_000,
        pdfsFilesCount: 6,
        totalBytes: 10_100_000,
        totalFilesCount: 35,
      },
      topFolders: [{ id: 'f1', name: 'Archivo Legal', type: 'pdf', totalBytes: 3_000_000, itemsCount: 3 }],
      warning: true,
      warningMessage: 'Uso de disco por encima del 85%',
    });

    renderAdmin('/admin/storage');

    expect(await screen.findByTestId('storage-warning-banner')).toHaveTextContent(
      'Uso de disco por encima del 85%'
    );
    expect(screen.getByTestId('storage-disk-section')).toBeInTheDocument();
    expect(screen.getByTestId('top-folders-table')).toHaveTextContent('Archivo Legal');
  });

  it('/admin/system edita URL, diagnostica /health, previsualiza shortCode, abre Scalar y descarga /openapi.json', async () => {
    const healthSpy = vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-11-19T16:00:00Z',
      latencyMs: 24,
      uptime: 7320,
    });
    const openApiSpy = vi.spyOn(healthService, 'fetchOpenApiSpec').mockResolvedValue({
      openapi: '3.1.0',
      paths: {},
    });
    const openPreviewSpy = vi.fn();

    renderAdmin('/admin/system', openPreviewSpy);

    expect(await screen.findByText(/Latencia: 24 ms/i)).toBeInTheDocument();
    expect(screen.getByText('2h 2m')).toBeInTheDocument();

    // Editar URL base del backend
    fireEvent.change(screen.getByTestId('system-api-url-input'), {
      target: { value: 'https://api.archivo.local' },
    });
    fireEvent.click(screen.getByTestId('system-save-url-btn'));
    await waitFor(() => {
      expect(storageService.getApiBaseUrl()).toBe('https://api.archivo.local');
      expect(healthSpy).toHaveBeenCalledTimes(2);
    });

    // Previsualizar PDF por shortCode
    fireEvent.change(screen.getByTestId('system-preview-kind'), { target: { value: 'pdf' } });
    fireEvent.change(screen.getByTestId('system-preview-code-input'), {
      target: { value: 'p/doc12' },
    });
    fireEvent.click(screen.getByTestId('system-preview-open-btn'));
    expect(openPreviewSpy).toHaveBeenCalledWith({ type: 'pdf', shortCode: 'doc12' });

    // Abrir visor Scalar y descargar openapi.json
    fireEvent.click(screen.getByTestId('system-toggle-scalar-btn'));
    expect(await screen.findByTestId('scalar-docs-iframe')).toHaveAttribute(
      'src',
      'https://api.archivo.local/docs'
    );

    fireEvent.click(screen.getByTestId('system-download-openapi-btn'));
    await waitFor(() => {
      expect(openApiSpy).toHaveBeenCalledTimes(1);
    });
  });
});
