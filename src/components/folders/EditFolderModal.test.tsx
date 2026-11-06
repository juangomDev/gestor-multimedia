import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EditFolderModal } from './EditFolderModal';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { foldersService } from '../../services/foldersService';
import { storageService } from '../../services/storageService';
import type { FolderItem } from '../../types/media';

/**
 * Renderiza `EditFolderModal` con los proveedores de autenticación y notificaciones.
 */
const renderEditModal = (
  folder: FolderItem | null,
  onFolderUpdated = vi.fn(),
  onClose = vi.fn()
) =>
  render(
    <AuthProvider>
      <ToastProvider>
        <EditFolderModal
          folder={folder}
          isOpen={true}
          onClose={onClose}
          onFolderUpdated={onFolderUpdated}
        />
      </ToastProvider>
    </AuthProvider>
  );

describe('EditFolderModal Component (13.3)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    storageService.saveSession({
      token: 'admin-token',
      user: { id: 'admin-1', username: 'admin', role: 'ADMIN' },
    });
  });

  it('updates folder name, color and privacy when user is owner or ADMIN', async () => {
    const folder: FolderItem = {
      id: 'fld-100',
      name: 'Campaña Primavera',
      type: 'image',
      color: '#3b82f6',
      isPrivate: false,
      userId: 'admin-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const updateSpy = vi.spyOn(foldersService, 'updateFolder').mockResolvedValue({
      ...folder,
      name: 'Campaña Otoño',
      color: '#10b981',
      isPrivate: true,
    });
    const onUpdated = vi.fn();
    const onClose = vi.fn();

    renderEditModal(folder, onUpdated, onClose);

    const nameInput = screen.getByLabelText(/Nuevo nombre de carpeta/i);
    const colorBtn = screen.getByRole('button', { name: 'Color #10b981' });
    const privacyToggle = screen.getByRole('button', { name: /Alternar privacidad/i });
    const saveBtn = screen.getByRole('button', { name: /Guardar Cambios/i });

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Campaña Otoño' } });
      fireEvent.click(colorBtn);
      fireEvent.click(privacyToggle);
      fireEvent.click(saveBtn);
    });

    expect(updateSpy).toHaveBeenCalledWith('fld-100', {
      name: 'Campaña Otoño',
      color: '#10b981',
      isPrivate: true,
    });
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('blocks editing when folder is system "General" (13.3.2)', () => {
    const generalFolder: FolderItem = {
      id: 'fld-gen',
      name: 'General',
      type: 'image',
      color: '#3b82f6',
      isPrivate: false,
      userId: 'admin-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    renderEditModal(generalFolder);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /La carpeta del sistema General está protegida/i
    );
    expect(screen.getByLabelText(/Nuevo nombre de carpeta/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeDisabled();
  });

  it('blocks editing when user is neither owner nor ADMIN (13.3.2)', () => {
    storageService.saveSession({
      token: 'col-token',
      user: { id: 'col-5', username: 'colaborador', role: 'COLLABORATOR' },
    });

    const otherUserFolder: FolderItem = {
      id: 'fld-other',
      name: 'Proyecto de Otro Manager',
      type: 'table',
      color: '#f59e0b',
      isPrivate: false,
      userId: 'mgr-1',
      myPermission: 'READ',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    renderEditModal(otherUserFolder);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Solo el propietario de la carpeta o un ADMIN pueden editar/i
    );
    expect(screen.getByLabelText(/Nuevo nombre de carpeta/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeDisabled();
  });
});

