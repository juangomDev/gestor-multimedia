import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './apiClient';

describe('apiClient - DELETE & Content-Type Headers', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('no debe incluir la cabecera Content-Type en peticiones DELETE sin cuerpo', async () => {
    let capturedHeaders: Headers | undefined;

    globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedHeaders = new Headers(init.headers);
      return Promise.resolve(new Response(null, { status: 204 }));
    });

    await apiClient.delete('/api/v1/images/b801a6b0-4fa2-430b-a63e-360cb4fa7731');

    expect(capturedHeaders).toBeDefined();
    expect(capturedHeaders?.has('Content-Type')).toBe(false);
  });
});

