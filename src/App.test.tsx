import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from './App';
import { healthService } from './services/healthService';
import { imagesService } from './services/imagesService';
import { tablesService } from './services/tablesService';
import { storageService } from './services/storageService';

describe('App Root Integration', () => {
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
      timestamp: '2026-10-28T18:00:00Z',
    });
    vi.spyOn(imagesService, 'fetchRemoteImages').mockResolvedValue([]);
    vi.spyOn(tablesService, 'fetchRemoteTables').mockResolvedValue([]);
  });

  it('renders login view by default when unauthenticated (Auth Guard)', async () => {
    localStorage.clear();
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole('heading', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    expect(screen.queryByTestId('images-view')).not.toBeInTheDocument();
  });

  it('renders sidebar, and images view when authenticated', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Multimedia')).toBeInTheDocument();
    expect(screen.getAllByText('Galería de Imágenes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Data Studio (Tablas)')).toBeInTheDocument();
    expect(screen.getByTestId('images-view')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /Estado del sistema/i })).toBeInTheDocument();
    expect(screen.getByText(/Versión v0\.30\.10/i)).toBeInTheDocument();
  });

  it('switches between Images View and Tables Catalog View', async () => {
    await act(async () => {
      render(<App />);
    });

    const tablesTab = screen.getByRole('button', { name: /Data Studio \(Tablas\)/i });

    await act(async () => {
      fireEvent.click(tablesTab);
    });

    expect(screen.getByTestId('tables-catalog-view')).toBeInTheDocument();
  });

  it('synchronizes remote images and tables on mount', async () => {
    const fetchImgsSpy = vi.spyOn(imagesService, 'fetchRemoteImages').mockResolvedValue([]);
    const fetchTabsSpy = vi.spyOn(tablesService, 'fetchRemoteTables').mockResolvedValue([]);

    await act(async () => {
      render(<App />);
    });

    expect(fetchImgsSpy).toHaveBeenCalledTimes(1);
    expect(fetchTabsSpy).toHaveBeenCalledTimes(1);
  });

  it('navigates to Settings & API Tools view without modal dialogs', async () => {
    await act(async () => {
      render(<App />);
    });

    const settingsBtn = screen.getByRole('button', { name: /Configuración API/i });

    await act(async () => {
      fireEvent.click(settingsBtn);
    });

    expect(screen.getByRole('heading', { name: /Configuración & Herramientas API/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Conexión con Monolith Backend/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Importación por ShortCode/i })).toBeInTheDocument();
  });

  it('logs out and remains in LoginView on refresh', async () => {
    await act(async () => {
      render(<App />);
    });

    const logoutBtn = screen.getByRole('button', { name: /Cerrar sesión/i });
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    expect(screen.getByRole('heading', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    expect(storageService.getSession()).toBeNull();
  });
});
