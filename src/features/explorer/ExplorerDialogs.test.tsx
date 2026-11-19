import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { CreateFolderDialog } from './CreateFolderDialog';
import { EditFolderDialog } from './EditFolderDialog';
import { DeleteFolderDialog } from './DeleteFolderDialog';
import { ShareFolderDialog } from './ShareFolderDialog';
import { MoveResourceDialog } from './MoveResourceDialog';
import { UploadDialog } from './UploadDialog';
import { foldersService } from '../../services/foldersService';
import { usersService } from '../../services/usersService';
import { tablesService } from '../../services/tablesService';
import { authService } from '../../services/authService';
import { storageService } from '../../services/storageService';
import type { FolderItem } from '../../types/media';

const ALL_FOLDERS: FolderItem[] = [
  { id: 'f-root', name: 'Raiz Contenedor', type: 'container', parentId: null, myPermission: 'ADMIN', createdAt: '' },
  { id: 'f-tbl-1', name: 'Ventas', type: 'table', parentId: 'f-root', myPermission: 'EDIT', createdAt: '' },
  { id: 'f-tbl-2', name: 'Histórico', type: 'table', parentId: 'f-root', myPermission: 'EDIT', createdAt: '' },
  { id: 'f-tbl-ro', name: 'Solo Lectura', type: 'table', parentId: 'f-root', myPermission: 'READ', createdAt: '' },
  { id: 'f-img-1', name: 'Fotos', type: 'image', parentId: 'f-root', myPermission: 'EDIT', createdAt: '' },
  { id: 'f-general', name: 'General', type: 'image', parentId: null, myPermission: 'ADMIN', createdAt: '' },
  { id: 'f-shared', name: 'shared', type: 'container', parentId: null, isSystem: true, myPermission: 'READ', createdAt: '' },
];

function wrap(ui: React.ReactNode) {
  const user = { id: 'u-mgr', username: 'gestor', role: 'MANAGER' as const, isActive: true };
  storageService.saveSession({ token: 'jwt-mgr', user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  return render(<AppProviders queryClient={createAppQueryClient()}>{ui}</AppProviders>);
}

describe('Explorer Dialogs v2 (Fase 4.3 & 4.4 — Jerarquía 3 niveles, ai_manager, Move, Upload .json)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
  });

  it('CreateFolderDialog hereda y bloquea el tipo del padre dentro de carpeta tipada TABLE', () => {
    wrap(
      <CreateFolderDialog
        open={true}
        onOpenChange={vi.fn()}
        parentFolder={ALL_FOLDERS[1]}
        allFolders={ALL_FOLDERS}
      />
    );

    expect(screen.getByRole('radio', { name: /Tablas/i })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /Tablas/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Imágenes/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /PDFs/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Contenedor/i })).toBeDisabled();
  });

  it('EditFolderDialog y DeleteFolderDialog protegen General y shared', () => {
    const editView = wrap(
      <EditFolderDialog folder={ALL_FOLDERS[5]} open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByLabelText(/Nombre de la carpeta/i)).toBeDisabled();
    editView.unmount();

    wrap(<DeleteFolderDialog folder={ALL_FOLDERS[6]} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Eliminar en cascada/i })).toBeDisabled();
  });

  it('ShareFolderDialog publica en ai_manager (READ) en 1 clic y excluye a ai_manager del selector de colaboradores', async () => {
    vi.spyOn(foldersService, 'listShares').mockResolvedValue([]);
    vi.spyOn(usersService, 'listUsers').mockResolvedValue([
      { id: 'u-ai', username: 'ai_manager', role: 'MANAGER', isActive: true },
      { id: 'u-col', username: 'maria_col', role: 'COLLABORATOR', isActive: true },
    ]);
    const shareSpy = vi.spyOn(foldersService, 'shareFolder').mockResolvedValue({
      id: 'sh-ai',
      folderId: 'f-tbl-1',
      userId: 'u-ai',
      permission: 'READ',
    });

    wrap(<ShareFolderDialog folder={ALL_FOLDERS[1]} open={true} onOpenChange={vi.fn()} />);

    const select = await screen.findByLabelText(/Seleccionar colaborador/i);
    await waitFor(() => {
      expect(select).toHaveTextContent('maria_col');
    });
    expect(select).not.toHaveTextContent('ai_manager');

    const aiSwitch = screen.getByRole('switch', {
      name: /Publicar en Widget de Chat Web Público \(ai_manager\)/i,
    });
    fireEvent.click(aiSwitch);

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledWith('f-tbl-1', 'u-ai', 'READ');
    });
  });

  it('MoveResourceDialog filtra exclusivamente carpetas compatibles con tipo TABLE y permiso EDIT', async () => {
    const onConfirmMove = vi.fn();
    wrap(
      <MoveResourceDialog
        open={true}
        onOpenChange={vi.fn()}
        resourceKind="table"
        resourceLabel="ventas.json"
        currentFolderId="f-tbl-1"
        allFolders={ALL_FOLDERS}
        onConfirmMove={onConfirmMove}
      />
    );

    expect(screen.getByText(/Raiz Contenedor › Histórico/i)).toBeInTheDocument();
    expect(screen.queryByText(/Fotos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Solo Lectura/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Mover aquí/i }));
    await waitFor(() => {
      expect(onConfirmMove).toHaveBeenCalledWith('f-tbl-2');
    });
  });

  it('UploadDialog valida extensiones y sube archivos .json pasando folderId explícito', async () => {
    const uploadSpy = vi.spyOn(tablesService, 'uploadTable').mockResolvedValue({
      id: 'tbl-new',
      shortCode: 'jsn10',
      tableName: 'metricas.json',
      rowCount: 10,
      sizeBytes: 128,
      url: 'http://localhost:3000/t/jsn10',
      folderId: 'f-tbl-1',
      createdAt: '',
    });

    const badFile = new File(['%PDF'], 'manual.pdf', { type: 'application/pdf' });
    const jsonFile = new File(['[{"a":1}]'], 'metricas.json', { type: 'application/json' });

    wrap(
      <UploadDialog
        open={true}
        onOpenChange={vi.fn()}
        folder={ALL_FOLDERS[1]}
        initialFiles={[badFile, jsonFile]}
      />
    );

    expect(screen.getByText(/Formato no compatible/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Subir \(1\)/i }));

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(jsonFile, 'f-tbl-1');
    });
  });
});
