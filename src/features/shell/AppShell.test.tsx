import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '../../App';
import { AppRoutes } from '../../router';
import { createAppQueryClient } from '../../queries/queryClient';
import { resolveContextualUploadState } from './uploadContextRules';
import { authService } from '../../services/authService';
import { foldersService } from '../../services/foldersService';
import { tablesService } from '../../services/tablesService';
import { imagesService } from '../../services/imagesService';
import { usersService } from '../../services/usersService';
import { notificationsService } from '../../services/notificationsService';
import * as notificationsStream from '../../services/notificationsStream';
import { storageService } from '../../services/storageService';
import type { FolderItem } from '../../types/media';
import type { Role } from '../../types/auth';

const MOCK_TREE: FolderItem[] = [
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
    id: 'fld-proj',
    name: 'Campañas 2026',
    type: 'container',
    parentId: null,
    myPermission: 'EDIT',
    itemCount: 2,
    createdAt: '2026-11-19T00:00:00Z',
    children: [
      {
        id: 'fld-imgs',
        name: 'Banners',
        type: 'image',
        parentId: 'fld-proj',
        myPermission: 'EDIT',
        itemCount: 4,
        createdAt: '2026-11-19T00:00:00Z',
      },
      {
        id: 'fld-readonly',
        name: 'Solo Lectura',
        type: 'pdf',
        parentId: 'fld-proj',
        myPermission: 'READ',
        itemCount: 1,
        createdAt: '2026-11-19T00:00:00Z',
      },
    ],
  },
];

function renderAuthenticatedApp(role: Role, initialRoute = '/') {
  const user = { id: `u-${role}`, username: role.toLowerCase(), role, isActive: true };
  storageService.saveSession({ token: `jwt-${role}`, user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  vi.spyOn(foldersService, 'fetchFolderTree').mockResolvedValue(MOCK_TREE);
  vi.spyOn(usersService, 'listUsers').mockResolvedValue([]);
  vi.spyOn(usersService, 'listUsersPaginated').mockResolvedValue({
    users: [],
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
    hasNext: false,
  });
  vi.spyOn(imagesService, 'listImages').mockResolvedValue({
    items: [],
    meta: { total: 0, page: 1, limit: 50, totalPages: 1 },
  });
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

describe('AppShell, Guardas RBAC, Subida Contextual y Paleta ⌘K (Fase 3)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
  });

  describe('resolveContextualUploadState (Regla estricta cero subidas sin carpeta)', () => {
    it('deshabilita subida en raíz, CONTAINER, shared y carpetas READ; habilita con etiqueta exacta en EDIT', () => {
      expect(resolveContextualUploadState(null, 'ADMIN', 'u-1').enabled).toBe(false);
      expect(resolveContextualUploadState(MOCK_TREE[0], 'ADMIN', 'u-1').enabled).toBe(false);
      expect(resolveContextualUploadState(MOCK_TREE[1], 'ADMIN', 'u-1').enabled).toBe(false);
      expect(
        resolveContextualUploadState(MOCK_TREE[1].children![1], 'COLLABORATOR', 'u-col').enabled
      ).toBe(false);

      const imageState = resolveContextualUploadState(
        MOCK_TREE[1].children![0],
        'COLLABORATOR',
        'u-col'
      );
      expect(imageState.enabled).toBe(true);
      expect(imageState.label).toBe('Subir imagen');

      const tableState = resolveContextualUploadState(
        { id: 't1', name: 'Finanzas', type: 'table', myPermission: 'EDIT', createdAt: '' },
        'MANAGER',
        'u-mgr'
      );
      expect(tableState.enabled).toBe(true);
      expect(tableState.label).toBe('Subir tabla');

      const pdfState = resolveContextualUploadState(
        { id: 'p1', name: 'Contratos', type: 'pdf', myPermission: 'ADMIN', createdAt: '' },
        'ADMIN',
        'u-adm'
      );
      expect(pdfState.enabled).toBe(true);
      expect(pdfState.label).toBe('Subir PDF');
    });
  });

  describe('Guardas de rol (RequireRole) y visibilidad en Sidebar', () => {
    it('bloquea /team y /admin para COLLABORATOR y oculta ítems privilegiados', async () => {
      renderAuthenticatedApp('COLLABORATOR', '/admin/audit');

      expect(await screen.findByTestId('explorer-page')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Mi equipo/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Sistema y API/i })).not.toBeInTheDocument();
    });

    it('permite /team (lazy) a MANAGER pero bloquea /admin', async () => {
      renderAuthenticatedApp('MANAGER', '/team');

      expect(await screen.findByTestId('team-page', undefined, { timeout: 4000 })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Mi equipo/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Sistema y API/i })).not.toBeInTheDocument();
    });

    it('permite /admin/system (lazy) a ADMIN y adapta el botón "+ Subir imagen" dentro de /folder/:id', async () => {
      renderAuthenticatedApp('ADMIN', '/folder/fld-imgs');

      await waitFor(() => {
        const uploadBtn = screen.getByTestId('sidebar-upload-btn');
        expect(uploadBtn).toBeEnabled();
        expect(uploadBtn).toHaveTextContent('Subir imagen');
      });

      fireEvent.click(screen.getByRole('link', { name: /Sistema y API/i }));
      expect(await screen.findByTestId('admin-page', undefined, { timeout: 4000 })).toBeInTheDocument();
    });
  });

  describe('Paleta rápida ⌘K (listener global deduplicado y Abrir por shortCode)', () => {
    it('se abre con Ctrl+K, filtra carpetas y abre una Tabla por shortCode hacia /tables/:shortCode sin tocar localStorage', async () => {
      vi.spyOn(tablesService, 'fetchTableDetails').mockResolvedValue({
        id: 'tbl-9',
        shortCode: 'k9x2a',
        tableName: 'ventas_2026.json',
        columns: ['region', 'total'],
        headers: [['region', 'total']],
        merges: [],
        cellStyles: {},
        data: [{ region: 'Norte', total: 500 }],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1, hasNext: false },
      });

      renderAuthenticatedApp('ADMIN', '/');
      await screen.findByTestId('explorer-page');

      // Abrir con atajo global deduplicado Ctrl+K
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

      const searchInput = await screen.findByLabelText(/Buscar en la paleta rápida/i);
      fireEvent.change(searchInput, { target: { value: 'Banners' } });
      expect(await screen.findByText('Banners')).toBeInTheDocument();

      // Cambiar a pestaña "Abrir por shortCode"
      fireEvent.click(screen.getByRole('tab', { name: /Abrir por shortCode/i }));
      const codeInput = await screen.findByLabelText(/Código corto \(shortCode\)/i);
      fireEvent.change(codeInput, { target: { value: 'k9x2a' } });
      fireEvent.click(screen.getByRole('button', { name: /Abrir recurso/i }));

      expect(await screen.findByTestId('data-studio-page')).toBeInTheDocument();
      expect(await screen.findByText('ventas_2026.json')).toBeInTheDocument();
      expect(localStorage.getItem('dokploy_tables')).toBeNull();
    });

    it('abre una Imagen por shortCode directamente en el visor lazy ImageInspectorDialog', async () => {
      renderAuthenticatedApp('ADMIN', '/');
      await screen.findByTestId('explorer-page');

      fireEvent.keyDown(window, { key: 'k', metaKey: true });

      fireEvent.click(await screen.findByRole('tab', { name: /Abrir por shortCode/i }));
      fireEvent.click(screen.getByRole('radio', { name: /Imagen/i }));
      fireEvent.change(screen.getByLabelText(/Código corto \(shortCode\)/i), {
        target: { value: 'img777' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Abrir recurso/i }));

      expect(await screen.findByText(/Imagen · img777/i)).toBeInTheDocument();
      expect(localStorage.getItem('dokploy_images')).toBeNull();
    });
  });
});
