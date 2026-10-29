import { describe, it, expect, vi } from 'vitest';
import { healthService } from './healthService';
import { apiClient } from './apiClient';

describe('healthService', () => {
  it('returns backend health when response is ok', async () => {
    const mockHealth = {
      status: 'ok' as const,
      db: 'up' as const,
      storage: 'writable' as const,
      timestamp: '2026-10-28T18:00:00Z',
    };

    vi.spyOn(apiClient, 'get').mockResolvedValue(mockHealth);

    const res = await healthService.checkHealth();
    expect(res.status).toBe('ok');
    expect(res.db).toBe('up');
    expect(res.storage).toBe('writable');
  });

  it('returns degraded status when apiClient fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Connection refused'));

    const res = await healthService.checkHealth();
    expect(res.status).toBe('degraded');
    expect(res.db).toBe('down');
    expect(res.storage).toBe('unwritable');
  });
});
