import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from './App';
import { healthService } from './services/healthService';
import { imagesService } from './services/imagesService';
import { tablesService } from './services/tablesService';
import { foldersService } from './services/foldersService';
import { chatService } from './services/chatService';
import { storageService } from './services/storageService';
import type { FolderItem } from './types/media';

const mockFolders: FolderItem[] = [
  {
    id: 'fld-img-1',
    name: 'Campañas 2026',
    type: 'image',
    isPrivate: false,
    itemCount: 3,
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'fld-tbl-1',
    name: 'Estadísticas Regionales',
    type: 'table',
    isPrivate: false,
    itemCount: 2,
    createdAt: '2026-11-01T10:00:00Z',
  },
];

/**
 * Localiza el botón del árbol de carpetas del Sidebar a partir del nombre visible.
 */
const getFolderButton = (name: string): HTMLElement => {
  const btn = screen.getByText(name).closest('button');
  if (!btn) throw new Error(`Folder button "${name}" not found`);
  return btn;
};

describe('App — Integración global Módulo 18 (carpetas activas & chat RAG)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    storageService.saveSession({
      token: 'mock-admin-token',
      user: { id: 'admin-1', username: 'admin', role: 'ADMIN' },
    });

    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-11-05T12:00:00Z',
    });
    vi.spyOn(imagesService, 'fetchRemoteImages').mockResolvedValue([]);
    vi.spyOn(tablesService, 'fetchRemoteTables').mockResolvedValue([]);
    vi.spyOn(foldersService, 'fetchFolders').mockResolvedValue(mockFolders);
    vi.spyOn(chatService, 'getPublicSuggestions').mockResolvedValue([]);
  });

  it('filters gallery by active image folder and isolates folders per media category', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.queryByText('Estadísticas Regionales')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getFolderButton('Campañas 2026'));
    });

    expect(screen.getByText('Carpeta: Campañas 2026')).toBeInTheDocument();
    expect(imagesService.fetchRemoteImages).toHaveBeenCalledWith(
      expect.objectContaining({ folderId: 'fld-img-1' })
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Data Studio \(Tablas\)/i }));
    });

    expect(screen.getByTestId('tables-catalog-view')).toBeInTheDocument();
    expect(screen.getByText('Estadísticas Regionales')).toBeInTheDocument();
    expect(screen.queryByText('Campañas 2026')).not.toBeInTheDocument();
    expect(tablesService.fetchRemoteTables).not.toHaveBeenCalledWith(
      expect.objectContaining({ folderId: 'fld-img-1' })
    );
  });

  it('navigates to Data Chat and asks a question scoped to a table folder', async () => {
    const askSpy = vi.spyOn(chatService, 'askInternal').mockResolvedValue({
      answer: 'La región Norte registra 1.250 habitantes.',
      foundInSystem: true,
      sources: [],
    });

    await act(async () => {
      render(<App />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Consulta Inteligente \(Data Chat\)/i }));
    });

    expect(
      screen.getByRole('heading', { name: /Consulta Inteligente .* Data Chat/i })
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Contexto de consulta'), {
        target: { value: 'folder' },
      });
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Seleccionar carpeta para consulta'), {
        target: { value: 'fld-tbl-1' },
      });
      fireEvent.change(screen.getByLabelText('Pregunta analítica'), {
        target: { value: '¿Cuántos habitantes hay en el Norte?' },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Consultar/i }));
    });

    expect(askSpy).toHaveBeenCalledWith(
      '¿Cuántos habitantes hay en el Norte?',
      'fld-tbl-1',
      undefined
    );
    expect(await screen.findByText(/La región Norte registra 1.250 habitantes/i)).toBeInTheDocument();
  });
});
