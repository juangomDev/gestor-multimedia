/**
 * Pruebas del interruptor de publicación `ai_manager` en `ShareFolderModal` (Módulo 26.2).
 * @module components/folders/ShareFolderModal.aiManager.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ShareFolderModal } from './ShareFolderModal';
import { ToastProvider } from '../../context/ToastContext';
import { foldersService } from '../../services/foldersService';
import { usersService } from '../../services/usersService';
import type { FolderItem } from '../../types/media';

const tableFolder: FolderItem = {
  id: 'fld-ai-1',
  name: 'Estadísticas Públicas',
  type: 'table',
  color: '#10b981',
  isPrivate: false,
  userId: 'mgr-1',
  createdAt: '2026-01-10T00:00:00.000Z',
};

const usersWithAi = [
  { id: 'ai-1', username: 'ai_manager', role: 'MANAGER' as const, isActive: true },
  { id: 'col-1', username: 'ana_colab', role: 'COLLABORATOR' as const, isActive: true },
];

/**
 * Renderiza el modal de compartición con proveedor de Toasts.
 */
const renderModal = (onSharesChanged = vi.fn()) =>
  render(
    <ToastProvider>
      <ShareFolderModal folder={tableFolder} isOpen={true} onClose={vi.fn()} onSharesChanged={onSharesChanged} />
    </ToastProvider>
  );

describe('ShareFolderModal — Interruptor de publicación ai_manager (26.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('publica la carpeta compartiéndola en READ con ai_manager y la excluye del selector de colaboradores', async () => {
    vi.spyOn(foldersService, 'listShares').mockResolvedValue([]);
    vi.spyOn(usersService, 'listUsers').mockResolvedValue(usersWithAi);
    const shareSpy = vi.spyOn(foldersService, 'shareFolder').mockResolvedValue({
      id: 'sh-ai',
      folderId: 'fld-ai-1',
      userId: 'ai-1',
      permission: 'READ',
      user: { id: 'ai-1', username: 'ai_manager', role: 'MANAGER' },
    });
    const onSharesChanged = vi.fn();
    renderModal(onSharesChanged);

    const toggle = await screen.findByRole('switch', { name: /Publicar en Widget de Chat Web Público/i });
    await waitFor(() => expect(toggle).not.toBeDisabled());
    expect(toggle).not.toBeChecked();

    const userSelect = screen.getByLabelText('Seleccionar usuario colaborador');
    expect(userSelect).not.toHaveTextContent('ai_manager');
    expect(userSelect).toHaveTextContent('ana_colab');

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(shareSpy).toHaveBeenCalledWith('fld-ai-1', 'ai-1', 'READ');
    await waitFor(() => expect(screen.getByRole('switch', { name: /Publicar/i })).toBeChecked());
    expect(onSharesChanged).toHaveBeenCalled();
  });

  it('despublica la carpeta revocando el acceso de ai_manager', async () => {
    vi.spyOn(foldersService, 'listShares').mockResolvedValue([
      {
        id: 'sh-ai',
        folderId: 'fld-ai-1',
        userId: 'ai-1',
        permission: 'READ',
        user: { id: 'ai-1', username: 'ai_manager', role: 'MANAGER' },
      },
    ]);
    vi.spyOn(usersService, 'listUsers').mockResolvedValue(usersWithAi);
    const revokeSpy = vi.spyOn(foldersService, 'revokeShare').mockResolvedValue({ revoked: true });
    renderModal();

    const toggle = await screen.findByRole('switch', { name: /Publicar/i });
    await waitFor(() => expect(toggle).toBeChecked());

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(revokeSpy).toHaveBeenCalledWith('fld-ai-1', 'ai-1');
    await waitFor(() => expect(screen.getByRole('switch', { name: /Publicar/i })).not.toBeChecked());
  });

  it('deshabilita el interruptor cuando la cuenta ai_manager no está disponible', async () => {
    vi.spyOn(foldersService, 'listShares').mockResolvedValue([]);
    vi.spyOn(usersService, 'listUsers').mockResolvedValue([usersWithAi[1]]);
    renderModal();

    await screen.findByText('ana_colab (COLLABORATOR)');
    expect(screen.getByRole('switch', { name: /Publicar/i })).toBeDisabled();
  });
});

