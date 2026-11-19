import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';
import { storageService } from './services/storageService';
import { healthService } from './services/healthService';
import { authService } from './services/authService';
import { foldersService } from './services/foldersService';
import { notificationsService } from './services/notificationsService';
import * as notificationsStream from './services/notificationsStream';

describe('App v2 Root Integration (BrowserRouter + AuthGuard)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');

    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-11-19T00:00:00Z',
      latencyMs: 12,
    });
    vi.spyOn(foldersService, 'fetchFolderTree').mockResolvedValue([]);
    vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(0);
    vi.spyOn(notificationsStream, 'connectNotificationsStream').mockReturnValue({
      disconnect: vi.fn(),
    });
  });

  it('redirige automáticamente a /login cuando no hay sesión autenticada (sin botón demo)', async () => {
    render(<App />);

    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByText(/Administrador Maestro/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Demo/i)).not.toBeInTheDocument();
  });

  it('monta el AppShell v2 y el Explorador raíz cuando existe sesión real validada por /auth/me', async () => {
    storageService.saveSession({
      token: 'jwt-real-admin',
      user: { id: 'adm-1', username: 'admin', role: 'ADMIN', isActive: true },
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue({
      user: { id: 'adm-1', username: 'admin', role: 'ADMIN', isActive: true },
    });
    vi.spyOn(foldersService, 'fetchFolderTree').mockResolvedValue([
      {
        id: 'fld-shared',
        name: 'shared',
        type: 'container',
        parentId: null,
        isSystem: true,
        itemCount: 2,
        createdAt: '2026-11-19T00:00:00Z',
      },
    ]);

    render(<App />);

    expect(await screen.findByTestId('app-shell')).toBeInTheDocument();
    expect(await screen.findByTestId('explorer-page')).toBeInTheDocument();
    expect(await screen.findByText('shared')).toBeInTheDocument();
    expect(screen.getByText('SISTEMA')).toBeInTheDocument();
  });
});
