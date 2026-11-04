import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import { healthService } from '../../services/healthService';

describe('StatusBar Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-10-30T00:00:00Z',
      latencyMs: 32,
    });
  });

  it('renders API online status, storage and version', async () => {
    await act(async () => {
      render(<StatusBar totalBytes={40652} />);
    });

    expect(screen.getByText(/API Online \(32ms\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Almacenamiento:/i)).toBeInTheDocument();
    expect(screen.getByText(/39\.7 KB/i)).toBeInTheDocument();
    expect(screen.getByText(/50 GB/i)).toBeInTheDocument();
    expect(screen.getByText(/Versión v0\.30\.10/i)).toBeInTheDocument();
  });

  it('triggers health check when clicking status button', async () => {
    const checkSpy = vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-10-30T00:00:00Z',
      latencyMs: 15,
    });

    await act(async () => {
      render(<StatusBar totalBytes={1024} />);
    });

    const statusBtn = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(statusBtn);
    });

    expect(checkSpy).toHaveBeenCalled();
  });
});
