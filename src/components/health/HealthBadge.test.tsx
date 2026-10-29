import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { HealthBadge } from './HealthBadge';
import { healthService } from '../../services/healthService';

describe('HealthBadge component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Backend 100% OK" when status is ok', async () => {
    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-10-28T18:00:00Z',
    });

    await act(async () => {
      render(<HealthBadge />);
    });

    expect(screen.getByText(/API Online/i)).toBeInTheDocument();
  });

  it('renders "Backend Offline" when status is down', async () => {
    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'degraded',
      db: 'down',
      storage: 'unwritable',
      timestamp: '2026-10-28T18:00:00Z',
    });

    await act(async () => {
      render(<HealthBadge />);
    });

    expect(screen.getByText('Backend Offline')).toBeInTheDocument();
  });
});
