import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storageStatsService } from './storageStatsService';
import { apiClient } from './apiClient';

describe('storageStatsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtiene estadísticas de almacenamiento llamando a GET /api/v1/stats/storage', async () => {
    const mockStats = {
      isAdmin: true,
      database: {
        totalBytes: 1048576,
        imagesBytes: 524288,
        tablesBytes: 524288,
        formatted: {
          total: '1.00 MB',
          images: '512 KB',
          tables: '512 KB',
        },
      },
      disk: {
        usedBytes: 100000000,
        freeBytes: 900000000,
        totalBytes: 1000000000,
        usagePercent: 10,
        formatted: {
          used: '100 MB',
          free: '900 MB',
          total: '1 GB',
        },
      },
      topFolders: [
        {
          folderId: 'f-1',
          folderName: 'Banners',
          type: 'image' as const,
          itemCount: 12,
          totalBytes: 524288,
          formattedBytes: '512 KB',
        },
      ],
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockStats as never);

    const res = await storageStatsService.fetchStorageStats();
    expect(getSpy).toHaveBeenCalledWith('/api/v1/stats/storage');
    expect(res).toEqual(mockStats);
  });
});

