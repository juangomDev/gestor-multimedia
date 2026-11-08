import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeysManagerCard } from './ApiKeysManagerCard';
import { apiKeysService, type ApiKeyItem } from '../../services/apiKeysService';
import { ToastProvider } from '../../context/ToastContext';

describe('ApiKeysManagerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockKeys: ApiKeyItem[] = [
    {
      id: 'k-1',
      name: 'Webhook Key',
      keyPrefix: 'gm_live_wh12',
      rateLimit: 60,
      isActive: true,
      lastUsedAt: null,
      createdAt: '2026-11-08T00:00:00Z',
    },
  ];

  it('renderiza la lista de llaves y permite revocar una', async () => {
    vi.spyOn(apiKeysService, 'listApiKeys').mockResolvedValue(mockKeys);
    const deleteSpy = vi.spyOn(apiKeysService, 'deleteApiKey').mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <ToastProvider>
        <ApiKeysManagerCard />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Webhook Key')).toBeInTheDocument();
      expect(screen.getByText(/gm_live_wh12/)).toBeInTheDocument();
    });

    const revokeBtn = screen.getByRole('button', { name: /Revocar llave Webhook Key/i });
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('k-1');
      expect(screen.queryByText('Webhook Key')).not.toBeInTheDocument();
    });
  });

  it('abre el modal de creación al pulsar Nueva API Key', async () => {
    vi.spyOn(apiKeysService, 'listApiKeys').mockResolvedValue([]);

    render(
      <ToastProvider>
        <ApiKeysManagerCard />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No hay API Keys generadas/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Nueva API Key/i }));

    expect(screen.getByText('Crear Nueva API Key')).toBeInTheDocument();
  });
});
