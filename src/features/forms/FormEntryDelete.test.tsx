import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { formsService } from '../../services/formsService';
import { notificationsService } from '../../services/notificationsService';
import { tablesService } from '../../services/tablesService';
import { storageService } from '../../services/storageService';
import { ApiError } from '../../services/http/apiError';
import { FormInboxPage } from './FormInboxPage';
import { DataStudioPage } from '../data-studio/DataStudioPage';
import { extractOpenTableEntryId, isFormOpenTableMetadata } from '../data-studio/useOpenTableEntryDelete';
import type { FormDefinition, FormEntry } from '../../types/forms';
import type { PaginatedTableResponse } from '../../types/api';
import type { AuthUser } from '../../types/auth';
import type { FolderItem } from '../../types/media';

const ENTRY_NEW_ID = '11111111-1111-4111-8111-111111111111';
const ENTRY_VALID_ID = '22222222-2222-4222-8222-222222222222';
const ENTRY_INVALID_ID = '33333333-3333-4333-8333-333333333333';

const FORM_FIXTURE: FormDefinition = {
  id: 'form-rural-1',
  slug: 'solicitud-ruralidad',
  title: 'Solicitud de Constancia de Ruralidad',
  folderId: 'fld-sol',
  entryFieldsSchema: [
    { name: 'nombres', label: 'Nombres', type: 'string', required: true },
    { name: 'cedula', label: 'Cédula', type: 'string', required: true },
  ],
  resolutionFieldsSchema: [{ name: 'numero_oficio', label: 'Oficio', type: 'string' }],
  allowedResolutionStates: ['VALID', 'INVALID'],
  createdAt: '2026-11-20T10:00:00Z',
};

const ENTRIES_FIXTURE: FormEntry[] = [
  { id: ENTRY_NEW_ID, formId: 'form-rural-1', status: 'NEW', entryPayload: { nombres: 'Ana Pérez', cedula: '15111222' }, createdAt: '2026-11-26T10:00:00Z' },
  { id: ENTRY_VALID_ID, formId: 'form-rural-1', status: 'VALID', entryPayload: { nombres: 'Luis Gómez', cedula: '18333444' }, resolutionPayload: { numero_oficio: '01-0000001' }, resolvedAt: '2026-11-26T12:00:00Z', createdAt: '2026-11-25T10:00:00Z' },
  { id: ENTRY_INVALID_ID, formId: 'form-rural-1', status: 'INVALID', entryPayload: { nombres: 'Carla Ruiz', cedula: '20555666' }, resolutionPayload: { observaciones: 'Duplicada' }, resolvedAt: '2026-11-26T13:00:00Z', createdAt: '2026-11-24T10:00:00Z' },
];

const OPEN_TABLE_FIXTURE: PaginatedTableResponse = {
  id: 'tbl-open-1',
  shortCode: 'YA1Dnd6z8o',
  tableName: 'Respuestas: Solicitud de Constancia de Ruralidad',
  columns: ['id', 'entryId', 'itemIndex', 'nombres', 'cedula', 'status'],
  metadataCard: { title: 'Tabla Abierta: Solicitud de Constancia de Ruralidad', tags: ['form', 'respuestas', 'solicitud-ruralidad'] },
  data: [
    { id: `${ENTRY_VALID_ID}_0`, entryId: ENTRY_VALID_ID, itemIndex: 0, nombres: 'Luis Gómez', cedula: '18333444', status: 'VALID' },
    { id: `${ENTRY_VALID_ID}_1`, entryId: ENTRY_VALID_ID, itemIndex: 1, nombres: 'Luis Gómez', cedula: '18333444', status: 'VALID' },
  ],
  meta: { page: 1, limit: 50, total: 2, totalPages: 1, hasNext: false },
};

function setupUserAndFolder(user: AuthUser, folder: FolderItem) {
  storageService.saveSession({ token: `jwt-${user.id}`, user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  const queryClient = createAppQueryClient();
  queryClient.setQueryData(['folders', 'tree'], [folder]);
  return queryClient;
}

function renderInboxFor(user: AuthUser, folder: FolderItem) {
  const queryClient = setupUserAndFolder(user, folder);
  vi.spyOn(formsService, 'getForm').mockResolvedValue(FORM_FIXTURE);
  vi.spyOn(formsService, 'listEntries').mockResolvedValue({ entries: ENTRIES_FIXTURE, total: 3, page: 1, limit: 50, totalPages: 1 });
  vi.spyOn(notificationsService, 'getFormSubscription').mockResolvedValue({ subscribed: false, subscription: null });
  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={['/folder/fld-sol/forms/form-rural-1']}>
        <Routes>
          <Route path="/folder/:folderId/forms/:formId" element={<FormInboxPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>
  );
}

function renderDataStudioFor(user: AuthUser, folder: FolderItem, shortCode: string, tableId: string) {
  const queryClient = setupUserAndFolder(user, folder);
  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: `/tables/${shortCode}`, state: { folderId: folder.id, tableId, canEdit: true } }]}>
        <Routes>
          <Route path="/tables/:shortCode" element={<DataStudioPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>
  );
}

describe('Eliminación 1:1 de entradas de formularios y tablas abiertas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
  });

  it('extrae entryId de filas maestro-detalle, planas y compuestas, y detecta tablas abiertas', () => {
    expect(isFormOpenTableMetadata({ tags: ['form', 'respuestas'] })).toBe(true);
    expect(isFormOpenTableMetadata({ tags: ['finanzas'] })).toBe(false);
    expect(extractOpenTableEntryId({ entryId: ENTRY_VALID_ID, id: `${ENTRY_VALID_ID}_0` })).toBe(ENTRY_VALID_ID);
    expect(extractOpenTableEntryId({ id: ENTRY_NEW_ID })).toBe(ENTRY_NEW_ID);
    expect(extractOpenTableEntryId({ id: `${ENTRY_INVALID_ID}_2` })).toBe(ENTRY_INVALID_ID);
    expect(extractOpenTableEntryId({ nombres: 'Sin UUID' })).toBeNull();
  });

  it('permite al MANAGER propietario eliminar entradas NEW, VALID (con advertencia) e INVALID en FormInboxPage', async () => {
    const deleteSpy = vi.spyOn(formsService, 'deleteEntry').mockResolvedValue({
      deleted: true,
      id: ENTRY_VALID_ID,
      formId: 'form-rural-1',
      removedTableRows: 2,
    });

    renderInboxFor(
      { id: 'u-arold', username: 'Arold', role: 'MANAGER', isActive: true },
      { id: 'fld-sol', name: 'solicitudes', type: 'table', userId: 'u-arold', myPermission: 'ADMIN', createdAt: '' }
    );

    expect(await screen.findByTestId(`delete-entry-btn-${ENTRY_NEW_ID}`)).toBeInTheDocument();
    expect(screen.getByTestId(`delete-entry-btn-${ENTRY_VALID_ID}`)).toBeInTheDocument();
    expect(screen.getByTestId(`delete-entry-btn-${ENTRY_INVALID_ID}`)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`delete-entry-btn-${ENTRY_VALID_ID}`));
    expect(await screen.findByTestId('delete-entry-sealed-warning')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('delete-entry-confirm-btn'));
    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith(ENTRY_VALID_ID));
  });

  it('oculta los botones de borrado para COLLABORATOR con permiso EDIT y para MANAGER no propietario', async () => {
    const { unmount } = renderInboxFor(
      { id: 'u-col', username: 'analista', role: 'COLLABORATOR', isActive: true },
      { id: 'fld-sol', name: 'solicitudes', type: 'table', userId: 'u-arold', myPermission: 'EDIT', isShared: true, createdAt: '' }
    );

    expect(await screen.findByTestId(`resolve-btn-${ENTRY_NEW_ID}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`delete-entry-btn-${ENTRY_NEW_ID}`)).not.toBeInTheDocument();
    unmount();

    renderInboxFor(
      { id: 'u-other-mgr', username: 'otro', role: 'MANAGER', isActive: true },
      { id: 'fld-sol', name: 'solicitudes', type: 'table', userId: 'u-arold', myPermission: 'EDIT', isShared: true, createdAt: '' }
    );

    expect(await screen.findByTestId(`resolve-btn-${ENTRY_NEW_ID}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`delete-entry-btn-${ENTRY_NEW_ID}`)).not.toBeInTheDocument();
  });

  it('permite eliminar entradas por entryId en Tabla Abierta de DataStudioPage y muestra error RFC 7807 si falla', async () => {
    vi.spyOn(tablesService, 'fetchTableDetails').mockResolvedValue(OPEN_TABLE_FIXTURE);
    const deleteSpy = vi
      .spyOn(formsService, 'deleteEntry')
      .mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Solo el propietario o ADMIN'))
      .mockResolvedValueOnce({ deleted: true, id: ENTRY_VALID_ID, formId: 'form-rural-1', removedTableRows: 2 });

    renderDataStudioFor(
      { id: 'u-admin', username: 'admin', role: 'ADMIN', isActive: true },
      { id: 'fld-sol', name: 'solicitudes', type: 'table', userId: 'u-arold', createdAt: '' },
      'YA1Dnd6z8o',
      'tbl-open-1'
    );

    fireEvent.click(await screen.findByTestId('delete-table-row-0'));
    expect(await screen.findByTestId('delete-entry-sealed-warning')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('delete-entry-confirm-btn'));
    expect(await screen.findByTestId('delete-entry-error')).toHaveTextContent('Solo el propietario o ADMIN');

    fireEvent.click(screen.getByTestId('delete-entry-confirm-btn'));
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledTimes(2);
      expect(deleteSpy).toHaveBeenLastCalledWith(ENTRY_VALID_ID);
    });
  });

  it('nunca muestra botones de borrado en tablas estáticas CSV/Excel sin etiqueta form', async () => {
    vi.spyOn(tablesService, 'fetchTableDetails').mockResolvedValue({
      id: 'tbl-static-1',
      shortCode: 'csv01',
      tableName: 'ventas.csv',
      columns: ['id', 'region', 'monto'],
      metadataCard: { title: 'Ventas', tags: ['finanzas'] },
      data: [{ id: ENTRY_NEW_ID, region: 'Norte', monto: 500 }],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1, hasNext: false },
    });

    renderDataStudioFor(
      { id: 'u-admin', username: 'admin', role: 'ADMIN', isActive: true },
      { id: 'fld-sol', name: 'finanzas', type: 'table', userId: 'u-admin', createdAt: '' },
      'csv01',
      'tbl-static-1'
    );

    expect(await screen.findByText('ventas.csv')).toBeInTheDocument();
    expect(screen.queryByTestId('delete-table-row-0')).not.toBeInTheDocument();
  });
});
