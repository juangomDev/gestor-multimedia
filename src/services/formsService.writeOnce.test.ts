import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formsService } from './formsService';
import { apiClient } from './apiClient';
import { ApiError } from './http/apiError';

describe('formsService — Conflicto Write-Once 409 ENTRY_ALREADY_RESOLVED', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('propaga intacto el ApiError 409 ENTRY_ALREADY_RESOLVED al intentar re-sellar una entrada', async () => {
    const conflict = new ApiError(409, 'ENTRY_ALREADY_RESOLVED', 'Entry already resolved');
    vi.spyOn(apiClient, 'patch').mockRejectedValue(conflict);

    await expect(
      formsService.resolveEntry('entry-sealed', {
        status: 'VALID',
        resolutionPayload: { nota: 'segundo intento' },
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'ENTRY_ALREADY_RESOLVED',
    });
  });
});
