import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '../../App';
import { AppRoutes } from '../../router';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { foldersService } from '../../services/foldersService';
import { imagesService } from '../../services/imagesService';
import { tablesService } from '../../services/tablesService';
import { pdfsService } from '../../services/pdfsService';
import { formsService } from '../../services/formsService';
import { bulkService } from '../../services/bulkService';
import { notificationsService } from '../../services/notificationsService';
import * as notificationsStream from '../../services/notificationsStream';
import { storageService } from '../../services/storageService';
import type { FolderItem } from '../../types/media';
import type { Role } from '../../types/auth';

const TREE_FIXTURE: FolderItem[] = [
  {
    id: 'fld-shared',
    name: 'shared',
    type: 'container',
    parentId: null,
    isSystem: true,
    myPermission: 'READ',
    itemCount: 1,
    createdAt: '2026-11-19T00:00:00Z',
  },
  {
    id: 'fld-cont',
    name: 'Proyectos 2026',
    type: 'container',
    parentId: null,
    myPermission: 'ADMIN',
    itemCount: 2,
    createdAt: '2026-11-19T00:00:00Z',
    children: [
      {
        id: 'fld-imgs',
        name: 'Campaña Fotos',
        type: 'image',
        parentId: 'fld-cont',
        myPermission: 'EDIT',
        itemCount: 2,
        createdAt: '2026-11-19T00:00:00Z',
        children: [
          {
            id: 'fld-imgs-l3',
            name: 'Nivel 3 Final',
            type: 'image',
            parentId: 'fld-imgs',
            myPermission: 'EDIT',
            itemCount: 0,
            createdAt: '2026-11-19T00:00:00Z',
          },
        ],
      },
      {
        id: 'fld-tbls',
        name: 'Finanzas',
        type: 'table',
        parentId: 'fld-cont',
        myPermission: 'EDIT',
        itemCount: 1,
        createdAt: '2026-11-19T00:00:00Z',
      },
      {
        id: 'fld-pdfs',
        name: 'Contratos PDF',
        type: 'pdf',
        parentId: 'fld-cont',
        myPermission: 'EDIT',
        itemCount: 2,
        createdAt: '2026-11-19T00:00:00Z',
      },
    ],
  },
];

function renderExplorer(initialRoute = '/', role: Role = 'ADMIN') {
  const user = { id: `u-${role}`, username: role.toLowerCase(), role, isActive: true };
  storageService.saveSession({ token: `jwt-${role}`, user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  vi.spyOn(foldersService, 'fetchFolderTree').mockResolvedValue(TREE_FIXTURE);
  vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(0);
  vi.spyOn(notificationsStream, 'connectNotificationsStream').mockReturnValue({
    disconnect: vi.fn(),
  });

  const queryClient = createAppQueryClient();
  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>
  );
}

describe('ExplorerPage v2 (Fase 4 — Raíz solo carpetas, 3 niveles, Grid/Lista y Bulk)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
  });

  it('en raíz (/) muestra solo carpetas Nivel 1, cero peticiones de archivos sueltos y persiste vista Lista', async () => {
    const imgsSpy = vi.spyOn(imagesService, 'listImages');
    const tblsSpy = vi.spyOn(tablesService, 'listTables');
    const pdfsSpy = vi.spyOn(pdfsService, 'listPdfs');
    const formsSpy = vi.spyOn(formsService, 'listForms');

    renderExplorer('/');

    expect(await screen.findByText('Proyectos 2026')).toBeInTheDocument();
    expect(screen.getByText('shared')).toBeInTheDocument();
    expect(screen.getByText('SISTEMA')).toBeInTheDocument();
    expect(screen.queryByText('Campaña Fotos')).not.toBeInTheDocument();

    // Cero menú de mutación sobre shared (isSystem: true)
    expect(screen.queryByLabelText(/Acciones de la carpeta shared/i)).not.toBeInTheDocument();

    // Cero peticiones de archivos en raíz
    expect(imgsSpy).not.toHaveBeenCalled();
    expect(tblsSpy).not.toHaveBeenCalled();
    expect(pdfsSpy).not.toHaveBeenCalled();
    expect(formsSpy).not.toHaveBeenCalled();

    // Toggle Cuadrícula -> Lista persistido
    fireEvent.click(screen.getByRole('button', { name: /Vista en lista/i }));
    expect(await screen.findByTestId('explorer-list-table')).toBeInTheDocument();
    expect(storageService.getViewMode()).toBe('list');
  });

  it('en carpeta TABLE carga tablas (.json + Ficha Técnica) y formularios (_count.entries) en paralelo sin N+1', async () => {
    vi.spyOn(tablesService, 'listTables').mockResolvedValue({
      items: [
        {
          id: 'tbl-1',
          shortCode: 'jsn99',
          tableName: 'presupuesto_2026.json',
          rowCount: 140,
          sizeBytes: 4096,
          url: 'http://localhost:3000/t/jsn99',
          metadataCard: { title: 'Presupuesto Oficial' },
          folderId: 'fld-tbls',
          createdAt: '2026-11-19T00:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    });
    vi.spyOn(formsService, 'listForms').mockResolvedValue([
      {
        id: 'frm-1',
        slug: 'solicitudes',
        title: 'Solicitudes Presupuestales',
        folderId: 'fld-tbls',
        entryFieldsSchema: [],
        resolutionFieldsSchema: [],
        allowedResolutionStates: ['VALID', 'INVALID'],
        _count: { entries: 12 },
        createdAt: '2026-11-19T00:00:00Z',
      },
    ]);
    const listEntriesSpy = vi.spyOn(formsService, 'listEntries');

    renderExplorer('/folder/fld-tbls');

    expect(await screen.findByText('presupuesto_2026.json')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Ficha técnica')).toBeInTheDocument();
    expect(screen.getByText('Solicitudes Presupuestales')).toBeInTheDocument();
    expect(screen.getByText('12 entradas')).toBeInTheDocument();
    expect(listEntriesSpy).not.toHaveBeenCalled();
  });

  it('en carpeta IMAGE soporta selección múltiple y BulkActionBar con reporte de errores parciales', async () => {
    vi.spyOn(imagesService, 'listImages').mockResolvedValue({
      items: [
        {
          id: 'img-1',
          shortCode: 'pic01',
          originalName: 'portada.webp',
          mimeType: 'image/webp',
          sizeBytes: 2048,
          url: 'http://localhost:3000/i/pic01',
          folderId: 'fld-imgs',
          createdAt: '2026-11-19T00:00:00Z',
        },
        {
          id: 'img-2',
          shortCode: 'pic02',
          originalName: 'banner.png',
          mimeType: 'image/png',
          sizeBytes: 3072,
          url: 'http://localhost:3000/i/pic02',
          folderId: 'fld-imgs',
          createdAt: '2026-11-19T00:00:00Z',
        },
      ],
      meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
    });
    const bulkDeleteSpy = vi.spyOn(bulkService, 'bulkDeleteImages').mockResolvedValue({
      totalRequested: 2,
      successful: ['img-1'],
      failed: [{ id: 'img-2', reason: 'Permiso insuficiente' }],
    });

    renderExplorer('/folder/fld-imgs');

    expect(await screen.findByText('portada.webp')).toBeInTheDocument();
    const imgEl = screen.getByAltText('portada.webp');
    expect(imgEl.getAttribute('src')).toContain('variant=thumb');

    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar portada\.webp/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar banner\.png/i }));

    const bulkBar = await screen.findByTestId('bulk-action-bar');
    expect(bulkBar).toHaveTextContent('2 seleccionados');

    fireEvent.click(screen.getByRole('button', { name: /^Eliminar$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar eliminación/i }));

    await waitFor(() => {
      expect(bulkDeleteSpy).toHaveBeenCalledWith(['img-1', 'img-2']);
    });
    expect(await screen.findByText(/Permiso insuficiente/i)).toBeInTheDocument();
  });

  it('bloquea + Carpeta en Nivel 3 (MAX_FOLDER_DEPTH_EXCEEDED) y para COLLABORATOR en raíz', async () => {
    vi.spyOn(imagesService, 'listImages').mockResolvedValue({
      items: [],
      meta: { total: 0, page: 1, limit: 100, totalPages: 1 },
    });

    const l3 = renderExplorer('/folder/fld-imgs-l3', 'ADMIN');
    await waitFor(() => {
      expect(screen.getByTestId('explorer-new-folder-btn')).toBeDisabled();
    });
    l3.unmount();

    renderExplorer('/', 'COLLABORATOR');
    await screen.findByText('Proyectos 2026');
    expect(screen.getByTestId('explorer-new-folder-btn')).toBeDisabled();
  });

  it('en carpeta PDF habilita selección múltiple y ejecuta bulkDeletePdfs vía BulkActionBar', async () => {
    vi.spyOn(pdfsService, 'listPdfs').mockResolvedValue({
      items: [
        {
          id: 'pdf-1',
          shortCode: 'doc01',
          originalName: 'contrato-a.pdf',
          sizeBytes: 4096,
          pageCount: 3,
          isScanned: false,
          url: 'http://localhost:3000/p/doc01',
          folderId: 'fld-pdfs',
          createdAt: '2026-11-19T00:00:00Z',
        },
        {
          id: 'pdf-2',
          shortCode: 'doc02',
          originalName: 'anexo-b.pdf',
          sizeBytes: 2048,
          pageCount: 1,
          isScanned: false,
          url: 'http://localhost:3000/p/doc02',
          folderId: 'fld-pdfs',
          createdAt: '2026-11-19T00:00:00Z',
        },
      ],
      meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
    });
    const bulkDeletePdfsSpy = vi.spyOn(bulkService, 'bulkDeletePdfs').mockResolvedValue({
      totalRequested: 2,
      successful: ['pdf-1', 'pdf-2'],
      failed: [],
    });

    renderExplorer('/folder/fld-pdfs');
    expect(await screen.findByText('contrato-a.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar contrato-a\.pdf/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar anexo-b\.pdf/i }));
    expect(await screen.findByTestId('bulk-action-bar')).toHaveTextContent('2 seleccionados');

    fireEvent.click(screen.getByRole('button', { name: /^Eliminar$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar eliminación/i }));

    await waitFor(() => {
      expect(bulkDeletePdfsSpy).toHaveBeenCalledWith(['pdf-1', 'pdf-2']);
    });
  });
});
