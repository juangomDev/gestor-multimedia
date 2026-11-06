import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ShareFolderModal } from './ShareFolderModal';
import { ToastProvider } from '../../context/ToastContext';
import { foldersService } from '../../services/foldersService';
import { usersService } from '../../services/usersService';
import type { FolderItem } from '../../types/media';

const targetFolder: FolderItem = {
  id: 'fld-share-1',
  name: 'Activos Compartidos',
  type: 'image',
  color: '#3b82f6',
  isPrivate: true,
  userId: 'mgr-1',
  createdAt: '2026-01-10T00:00:00.000Z',
};

/**
 * Renderiza `ShareFolderModal` con proveedor de notificaciones.
 */
const renderShareModal = (onSharesChanged = vi.fn(), onClose = vi.fn()) =>
  render(
    <ToastProvider>
      <ShareFolderModal
        folder={targetFolder}
        isOpen={true}
        onClose={onClose}
        onSharesChanged={onSharesChanged}
      />
    </ToastProvider>
  );

describe('ShareFolderModal Component (13.4)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads active shares and available collaborators, and shares folder with initial permission', async () => {
    vi.spyOn(foldersService, 'listShares').mockResolvedValue([
      {
        id: 'sh-1',
        folderId: 'fld-share-1',
        userId: 'col-1',
        permission: 'READ',
        user: { id: 'col-1', username: 'ana_colab', role: 'COLLABORATOR' },
      },
    ]);

    vi.spyOn(usersService, 'listUsers').mockResolvedValue([
      {
        id: 'col-1',
        username: 'ana_colab',
        role: 'COLLABORATOR',
        isActive: true,
      },
      {
        id: 'col-2',
        username: 'carlos_editor',
        role: 'COLLABORATOR',
        isActive: true,
      },
    ]);

    const shareSpy = vi.spyOn(foldersService, 'shareFolder').mockResolvedValue({
      id: 'sh-2',
      folderId: 'fld-share-1',
      userId: 'col-2',
      permission: 'EDIT',
      user: { id: 'col-2', username: 'carlos_editor', role: 'COLLABORATOR' },
    });

    const onSharesChanged = vi.fn();
    renderShareModal(onSharesChanged);

    await waitFor(() => {
      expect(screen.getByTestId('share-member-ana_colab')).toBeInTheDocument();
    });

    const permSelect = screen.getByLabelText('Permiso inicial');
    const shareBtn = screen.getByRole('button', { name: /Compartir/i });

    await act(async () => {
      fireEvent.change(permSelect, { target: { value: 'EDIT' } });
      fireEvent.click(shareBtn);
    });

    expect(shareSpy).toHaveBeenCalledWith('fld-share-1', 'col-2', 'EDIT');
    expect(screen.getByTestId('share-member-carlos_editor')).toBeInTheDocument();
    expect(onSharesChanged).toHaveBeenCalled();
  });

  it('toggles member permission inline (READ <-> EDIT) and revokes member access', async () => {
    vi.spyOn(foldersService, 'listShares').mockResolvedValue([
      {
        id: 'sh-1',
        folderId: 'fld-share-1',
        userId: 'col-1',
        permission: 'READ',
        user: { id: 'col-1', username: 'ana_colab', role: 'COLLABORATOR' },
      },
    ]);
    vi.spyOn(usersService, 'listUsers').mockResolvedValue([]);

    const updatePermSpy = vi
      .spyOn(foldersService, 'updateSharePermission')
      .mockResolvedValue({
        id: 'sh-1',
        folderId: 'fld-share-1',
        userId: 'col-1',
        permission: 'EDIT',
      });

    const revokeSpy = vi
      .spyOn(foldersService, 'revokeShare')
      .mockResolvedValue({ revoked: true });

    renderShareModal();

    const inlineSelect = await screen.findByLabelText('Cambiar permiso de ana_colab');

    await act(async () => {
      fireEvent.change(inlineSelect, { target: { value: 'EDIT' } });
    });

    expect(updatePermSpy).toHaveBeenCalledWith('fld-share-1', 'col-1', 'EDIT');

    const revokeBtn = screen.getByRole('button', { name: 'Revocar acceso a ana_colab' });
    await act(async () => {
      fireEvent.click(revokeBtn);
    });

    expect(revokeSpy).toHaveBeenCalledWith('fld-share-1', 'col-1');
    expect(screen.queryByTestId('share-member-ana_colab')).not.toBeInTheDocument();
  });
});

