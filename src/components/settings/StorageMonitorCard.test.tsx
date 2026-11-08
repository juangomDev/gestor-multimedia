import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageMonitorCard } from './StorageMonitorCard';
import { storageStatsService } from '../../services/storageStatsService';
import { ToastProvider } from '../../context/ToastContext';

describe('StorageMonitorCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStats = {
    isAdmin: true,
    database: {
      totalSizeBytes: 5242880,
      totalCount: 50,
      images: { count: 30, sizeBytes: 3145728 },
      tables: { count: 20, sizeBytes: 2097152 },
    },
    disk: {
      totalBytes: 104857600,
      imagesBytes: 3145728,
      tablesBytes: 2097152,
    },
    topFolders: [
      {
        id: 'fld-1',
        name: 'Campañas 2026',
        type: 'image',
        itemsCount: 45,
        totalBytes: 3145728,
      },
    ],
  };

  it('renderiza telemetría de almacenamiento en base de datos y disco', async () => {
    vi.spyOn(storageStatsService, 'fetchStorageStats').mockResolvedValue(mockStats);

    render(
      <ToastProvider>
        <StorageMonitorCard />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('5 MB')).toBeInTheDocument();
      expect(screen.getByText('Campañas 2026')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Imágenes: 3 MB/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Tablas: 2 MB/).length).toBeGreaterThanOrEqual(1);
  });

  it('permite refrescar métricas al hacer clic en Actualizar', async () => {
    const fetchSpy = vi.spyOn(storageStatsService, 'fetchStorageStats').mockResolvedValue(mockStats);

    render(
      <ToastProvider>
        <StorageMonitorCard />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('5 MB')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Actualizar/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
