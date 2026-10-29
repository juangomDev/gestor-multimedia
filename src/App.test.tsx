import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from './App';
import { healthService } from './services/healthService';
import { imagesService } from './services/imagesService';
import { tablesService } from './services/tablesService';

describe('App Root Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-10-28T18:00:00Z',
    });
  });

  it('renders sidebar, and images view by default', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Multimedia')).toBeInTheDocument();
    expect(screen.getAllByText('Galería de Imágenes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Data Studio (Tablas)')).toBeInTheDocument();
    expect(screen.getByTestId('images-view')).toBeInTheDocument();
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
});
