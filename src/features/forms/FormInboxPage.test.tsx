import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { formsService } from '../../services/formsService';
import { notificationsService } from '../../services/notificationsService';
import { storageService } from '../../services/storageService';
import { ApiError } from '../../services/http/apiError';
import { CreateFormDialog } from './CreateFormDialog';
import { FormInboxPage } from './FormInboxPage';
import type { FormDefinition, FormEntry } from '../../types/forms';

const FORM_FIXTURE: FormDefinition = {
  id: 'form-1',
  slug: 'registro-proveedores',
  title: 'Registro de Proveedores',
  description: 'Alta mensual y validación documental',
  folderId: 'fld-tbls',
  entryFieldsSchema: [
    { name: 'empresa', label: 'Empresa', type: 'string', required: true },
    { name: 'monto', label: 'Monto', type: 'number', required: false },
  ],
  resolutionFieldsSchema: [
    { name: 'comentario', label: 'Comentario auditor', type: 'textarea', required: true },
  ],
  allowedResolutionStates: ['VALID', 'INVALID'],
  externalTargetUrl: 'https://erp.ejemplo.com/hooks/proveedores',
  createdAt: '2026-11-01T10:00:00Z',
};

const ENTRIES_FIXTURE: FormEntry[] = [
  {
    id: 'ent-new',
    formId: 'form-1',
    status: 'NEW',
    entryPayload: { empresa: 'Acme SA', monto: 2500 },
    createdAt: '2026-11-18T12:00:00Z',
  },
  {
    id: 'ent-valid',
    formId: 'form-1',
    status: 'VALID',
    entryPayload: { empresa: 'Norte SRL', monto: 1800 },
    resolutionPayload: { comentario: 'Documentación completa' },
    resolvedAt: '2026-11-18T14:00:00Z',
    createdAt: '2026-11-17T09:00:00Z',
  },
  {
    id: 'ent-invalid',
    formId: 'form-1',
    status: 'INVALID',
    entryPayload: { empresa: 'Beta Corp', monto: 500 },
    resolutionPayload: { comentario: 'RUT vencido' },
    resolvedAt: '2026-11-17T16:00:00Z',
    createdAt: '2026-11-16T11:00:00Z',
  },
];

function setupAuth() {
  const user = { id: 'u-admin', username: 'admin', role: 'ADMIN' as const, isActive: true };
  storageService.saveSession({ token: 'jwt-admin', user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
}

function renderInbox() {
  setupAuth();
  const queryClient = createAppQueryClient();
  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={['/folder/fld-tbls/forms/form-1']}>
        <Routes>
          <Route path="/folder/:folderId/forms/:formId" element={<FormInboxPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>
  );
}

describe('Formularios Dinámicos y Resolución Write-Once (Fase 5.4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  it('crea un formulario dinámico en carpeta TABLE vía CreateFormDialog (POST /api/v1/forms)', async () => {
    setupAuth();
    const createSpy = vi.spyOn(formsService, 'createForm').mockResolvedValue(FORM_FIXTURE);
    const onCreated = vi.fn();

    render(
      <AppProviders queryClient={createAppQueryClient()}>
        <CreateFormDialog
          open={true}
          onOpenChange={vi.fn()}
          folderId="fld-tbls"
          folderName="Finanzas"
          onCreated={onCreated}
        />
      </AppProviders>
    );

    fireEvent.change(await screen.findByLabelText('Título del formulario'), {
      target: { value: 'Registro de Proveedores' },
    });
    expect(screen.getByLabelText(/Slug público/i)).toHaveValue('registro-de-proveedores');

    fireEvent.change(screen.getByLabelText(/Webhook externo al sellar/i), {
      target: { value: 'https://erp.ejemplo.com/hooks/proveedores' },
    });

    fireEvent.click(screen.getByTestId('create-form-submit-btn'));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Registro de Proveedores',
          slug: 'registro-de-proveedores',
          folderId: 'fld-tbls',
          externalTargetUrl: 'https://erp.ejemplo.com/hooks/proveedores',
          allowedResolutionStates: ['VALID', 'INVALID'],
        })
      );
      expect(onCreated).toHaveBeenCalledWith(FORM_FIXTURE);
    });
  });

  it('renderiza desglose NEW/VALID/INVALID, filtro mensual, suscripción, Integrar en web y exportación .xlsx/.csv', async () => {
    vi.spyOn(formsService, 'getForm').mockResolvedValue(FORM_FIXTURE);
    const listSpy = vi.spyOn(formsService, 'listEntries').mockResolvedValue({
      entries: ENTRIES_FIXTURE,
      total: 3,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    vi.spyOn(notificationsService, 'getFormSubscription').mockResolvedValue({
      subscribed: false,
      subscription: null,
    });
    const subSpy = vi.spyOn(notificationsService, 'subscribeToForm').mockResolvedValue({
      formId: 'form-1',
      notifyOnNewEntry: true,
      notifyOnResolution: true,
    });
    const exportSpy = vi.spyOn(formsService, 'downloadExport').mockResolvedValue({
      blob: new Blob(['csv']),
      filename: 'registro.csv',
      contentType: 'text/csv',
      sizeBytes: 3,
    });

    renderInbox();

    expect(await screen.findByText('Registro de Proveedores')).toBeInTheDocument();
    expect(screen.getByTestId('stat-total')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-new')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-valid')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-invalid')).toHaveTextContent('1');

    // Filtro mensual (?month=2026-11)
    fireEvent.change(screen.getByTestId('form-month-input'), { target: { value: '2026-11' } });
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        'form-1',
        expect.objectContaining({ month: '2026-11' })
      );
    });

    // Suscripción a alertas
    fireEvent.click(screen.getByTestId('form-subscription-trigger'));
    fireEvent.click(await screen.findByTestId('form-subscribe-save-btn'));
    await waitFor(() => {
      expect(subSpy).toHaveBeenCalledWith('form-1', {
        notifyOnNewEntry: true,
        notifyOnResolution: true,
      });
    });

    // Modal Integrar en web (endpoint + snippet fetch)
    fireEvent.click(screen.getByTestId('form-embed-btn'));
    expect(await screen.findByTestId('form-public-endpoint')).toHaveTextContent(
      'http://localhost:3000/api/v1/public/forms/registro-proveedores/entries'
    );
    expect(screen.getByTestId('form-fetch-snippet')).toHaveTextContent("method: 'POST'");

    // Exportación .csv
    fireEvent.click(screen.getByTestId('form-export-csv-btn'));
    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalledWith(
        'form-1',
        'csv',
        expect.objectContaining({ month: '2026-11' })
      );
    });
  });

  it('sella dictamen write-once, maneja conflicto 409 ENTRY_ALREADY_RESOLVED y dispara dispatch webhook', async () => {
    vi.spyOn(formsService, 'getForm').mockResolvedValue(FORM_FIXTURE);
    vi.spyOn(formsService, 'listEntries').mockResolvedValue({
      entries: ENTRIES_FIXTURE,
      total: 3,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    vi.spyOn(notificationsService, 'getFormSubscription').mockResolvedValue({
      subscribed: false,
      subscription: null,
    });
    const resolveSpy = vi
      .spyOn(formsService, 'resolveEntry')
      .mockRejectedValueOnce(
        new ApiError(409, 'ENTRY_ALREADY_RESOLVED', 'Entry already resolved')
      )
      .mockResolvedValueOnce({ ...ENTRIES_FIXTURE[0], status: 'VALID' });
    const dispatchSpy = vi.spyOn(formsService, 'dispatchEntry').mockResolvedValue({
      dispatched: true,
      targetUrl: 'https://erp.ejemplo.com/hooks/proveedores',
      entryId: 'ent-valid',
      dispatchedAt: '2026-11-19T15:00:00Z',
    });

    renderInbox();

    // 1. Conflicto 409 ENTRY_ALREADY_RESOLVED en entrada NEW
    fireEvent.click(await screen.findByTestId('resolve-btn-ent-new'));
    fireEvent.change(await screen.findByLabelText(/Comentario auditor/i), {
      target: { value: 'Aprobado en comité' },
    });
    fireEvent.click(screen.getByTestId('resolve-entry-submit-btn'));

    expect(await screen.findByTestId('entry-conflict-409')).toHaveTextContent(
      /409 ENTRY_ALREADY_RESOLVED/i
    );
    expect(resolveSpy).toHaveBeenCalledWith('ent-new', {
      status: 'VALID',
      resolutionPayload: { comentario: 'Aprobado en comité' },
    });

    // Cerrar diálogo y despachar webhook en entrada sellada
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByTestId('dispatch-btn-ent-valid'));

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith('ent-valid');
    });
  });
});
