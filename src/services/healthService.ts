import { apiClient } from './apiClient';
import type { HealthResponse } from '../types/api';

export class HealthService {
  async checkHealth(): Promise<HealthResponse> {
    const start = performance.now();
    try {
      const res = await apiClient.get<HealthResponse>('/health', {
        skipAuth: true,
        timeoutMs: 5000,
      });
      const latencyMs = Math.round(performance.now() - start);
      return {
        ...res,
        latencyMs,
      };
    } catch {
      return {
        status: 'degraded',
        db: 'down',
        storage: 'unwritable',
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      };
    }
  }
}

export const healthService = new HealthService();
