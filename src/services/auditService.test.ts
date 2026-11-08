import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditService } from './auditService';
import { apiClient } from './apiClient';

describe('auditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('llama a GET /api/v1/audit-logs con paginación y filtros', async () => {
    const mockResponse = {
      logs: [
        {
          id: 'log-1',
          action: 'CREATE',
          resourceType: 'IMAGE',
          resourceId: 'img-123',
          actorId: 'usr-1',
          actorUsername: 'admin',
          actorRole: 'ADMIN',
          ipAddress: '127.0.0.1',
          folderId: null,
          metadata: { name: 'test.png' },
          createdAt: '2026-11-08T00:00:00Z',
        },
      ],
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResponse as never);

    const result = await auditService.fetchAuditLogs({
      page: 2,
      limit: 10,
      action: 'CREATE',
      resourceType: 'IMAGE',
      folderId: 'f-1',
    });

    expect(getSpy).toHaveBeenCalledWith(
      '/api/v1/audit-logs?page=2&limit=10&action=CREATE&resourceType=IMAGE&folderId=f-1'
    );
    expect(result).toEqual(mockResponse);
  });

  it('llama a GET /api/v1/audit-logs sin parámetros opcionales', async () => {
    const mockResponse = {
      logs: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 1,
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResponse as never);

    const result = await auditService.fetchAuditLogs();

    expect(getSpy).toHaveBeenCalledWith('/api/v1/audit-logs');
    expect(result.logs).toEqual([]);
  });
});
