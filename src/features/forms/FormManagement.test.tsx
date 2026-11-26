import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { formsService } from '../../services/formsService';
import { notificationsService } from '../../services/notificationsService';
import { storageService } from '../../services/storageService';
import { FormInboxPage } from './FormInboxPage';
import { EditFormDialog } from './EditFormDialog';
import type { FormDefinition } from '../../types/forms';

const FORM_DETAIL: FormDefinition = {
  id: 'form-1',
  slug: 'registro-proveedores',
  title: 'Registro de Proveedores',
  description: 'Alta mensual y validación documental',
  folderId: 'fld-tbls',
  linkedTableId: 'tbl-open-1',
  linkedTable: { id: 'tbl-open-1', shortCode: 'opn99', tableName: 'proveedores_open.json' },
  entryFieldsSchema: [{ name: 'empresa', label: 'Empresa', type: 'string', required: true }],
  resolutionFieldsSchema: [{ name: 'nota', label: 'Nota', type: 'textarea', required: true }],
  allowedResolutionStates: ['VALID', 'INVALID'],
  autoResolveWithAi: false,
  externalTargetUrl: 'https://erp.ejemplo.com/hooks/proveedores',
  _count: { entries: 2 },
  createdAt: '2026-11-01T10:00:00Z',
};

function setupUser(role: 'ADMIN' | 'COLLABORATOR' = 'ADMIN') {
  const user = { id: `u-${role}`, username: role.toLowerCase(), role, isActive: true };
  storageService.saveSession({ token: `jwt-${role}`, user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
}

function renderInboxPage(readOnly = false) {
  setupUser(readOnly ? 'COLLABORATOR' : 'ADMIN');
  const queryClient = createAppQueryClient();
  if (readOnly) {
    queryClient.setQueryData(['folders', 'tree'], [
      {
        id: 'fld-tbls',
        name: 'Finanzas',
        type: 'table',
        parentId: null,
        myPermission: 'READ',
        createdAt: '',
      },
    ]);
  }
  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={['/folder/fld-tbls/forms/form-1']}>
        <Routes>
          <Route path="/folder/:folderId/forms/:formId" element={<FormInboxPage />} />
          <Route
            path="/folder/:folderId"
            element={<div data-testid="folder-return-view">Carpeta destino cargada</div>}
          />
        </Routes>
      </MemoryRouter>
    </AppProviders>
  );
}

describe('Gestión de Formularios — PATCH /api/v1/forms/:id y DELETE /api/v1/forms/:id (Ola 2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
  });

  it('edita título, estados permitidos, bandera autoResolveWithAi y limpia webhook desde FormInboxPage', async () => {
    vi.spyOn(formsService, 'getForm').mockResolvedValue(FORM_DETAIL);
    vi.spyOn(formsService, 'listEntries').mockResolvedValue({
      entries: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    vi.spyOn(notificationsService, 'getFormSubscription').mockResolvedValue({
      subscribed: false,
      subscription: null,
    });
    const updateSpy = vi.spyOn(formsService, 'updateForm').mockResolvedValue({
      ...FORM_DETAIL,
      title: 'Proveedores Verificados',
      allowedResolutionStates: ['VALID', 'INVALID', 'OBSERVED'],
      autoResolveWithAi: true,
      externalTargetUrl: null,
    });

    renderInboxPage();
    fireEvent.click(await screen.findByTestId('form-edit-btn'));

    const titleInput = await screen.findByLabelText('Título del formulario');
    fireEvent.change(titleInput, { target: { value: 'Proveedores Verificados' } });

    fireEvent.change(screen.getByLabelText('Nuevo estado permitido'), {
      target: { value: 'observed' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Añadir$/i }));

    fireEvent.click(
      screen.getByRole('switch', { name: /Activar o desactivar resolución asistida por IA/i })
    );

    const webhookInput = screen.getByLabelText(/Webhook externo al sellar/i);
    fireEvent.change(webhookInput, { target: { value: 'nota-invalida' } });
    fireEvent.click(screen.getByTestId('edit-form-submit-btn'));
    expect(await screen.findByTestId('edit-form-error')).toHaveTextContent(/URL de webhook válida/i);
    expect(updateSpy).not.toHaveBeenCalled();

    fireEvent.change(webhookInput, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('edit-form-submit-btn'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('form-1', {
        title: 'Proveedores Verificados',
        allowedResolutionStates: ['VALID', 'INVALID', 'OBSERVED'],
        autoResolveWithAi: true,
        externalTargetUrl: null,
      });
    });
  });

  it('muestra impacto en cascada (entradas + tabla abierta) al eliminar y redirige a la carpeta', async () => {
    vi.spyOn(formsService, 'getForm').mockResolvedValue(FORM_DETAIL);
    vi.spyOn(formsService, 'listEntries').mockResolvedValue({
      entries: [
        {
          id: 'e-1',
          formId: 'form-1',
          status: 'NEW',
          entryPayload: { empresa: 'Acme' },
          createdAt: '2026-11-18T10:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    vi.spyOn(notificationsService, 'getFormSubscription').mockResolvedValue({
      subscribed: false,
      subscription: null,
    });
    const deleteSpy = vi
      .spyOn(formsService, 'deleteForm')
      .mockResolvedValue({ deleted: true, id: 'form-1' });

    renderInboxPage();
    fireEvent.click(await screen.findByTestId('form-delete-btn'));

    expect(await screen.findByText(/Eliminación permanente en cascada/i)).toBeInTheDocument();
    expect(screen.getByText('proveedores_open.json')).toBeInTheDocument();
    expect(screen.getByText('.data.json.gz')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('delete-form-confirm-btn'));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('form-1');
      expect(screen.getByTestId('folder-return-view')).toBeInTheDocument();
    });
  });

  it('oculta Configurar y Eliminar formulario cuando el usuario solo tiene permiso READ', async () => {
    vi.spyOn(formsService, 'getForm').mockResolvedValue({
      ...FORM_DETAIL,
      autoResolveWithAi: true,
    });
    vi.spyOn(formsService, 'listEntries').mockResolvedValue({
      entries: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    vi.spyOn(notificationsService, 'getFormSubscription').mockResolvedValue({
      subscribed: false,
      subscription: null,
    });

    renderInboxPage(true);
    expect(await screen.findByTestId('form-ai-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('form-edit-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('form-delete-btn')).not.toBeInTheDocument();
  });

  it('hidrata el detalle completo vía GET /api/v1/forms/:id cuando EditFormDialog se abre desde el Explorador', async () => {
    setupUser('ADMIN');
    const summaryFromExplorer: FormDefinition = {
      id: 'form-1',
      slug: 'registro-proveedores',
      title: 'Registro de Proveedores',
      folderId: 'fld-tbls',
      entryFieldsSchema: [],
      resolutionFieldsSchema: [],
      allowedResolutionStates: [],
      createdAt: '2026-11-01T10:00:00Z',
    };

    const getFormSpy = vi.spyOn(formsService, 'getForm').mockResolvedValue({
      ...FORM_DETAIL,
      autoResolveWithAi: true,
      allowedResolutionStates: ['VALID', 'INVALID', 'PENDING_DOC'],
      externalTargetUrl: 'https://hooks.miempresa.com/v1',
    });

    render(
      <AppProviders queryClient={createAppQueryClient()}>
        <EditFormDialog
          open={true}
          onOpenChange={vi.fn()}
          form={summaryFromExplorer}
          hydrateDetail={true}
        />
      </AppProviders>
    );

    await waitFor(() => {
      expect(getFormSpy).toHaveBeenCalledWith('form-1');
      expect(screen.getByLabelText(/Webhook externo al sellar/i)).toHaveValue(
        'https://hooks.miempresa.com/v1'
      );
    });
    expect(screen.getByText('PENDING_DOC')).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: /Activar o desactivar resolución asistida por IA/i })
    ).toHaveAttribute('data-state', 'checked');
  });
});
