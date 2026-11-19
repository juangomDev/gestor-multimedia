import { describe, it, expect, beforeEach } from 'vitest';
import { storageService, DEFAULT_CONFIG } from './storageService';

describe('storageService (v2 — caché Map sin entidades de negocio)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetCache();
  });

  describe('Config & API Base URL', () => {
    it('returns DEFAULT_CONFIG with empty apiKey when storage is empty', () => {
      expect(DEFAULT_CONFIG.apiKey).toBe('');
      expect(storageService.getConfig()).toEqual(DEFAULT_CONFIG);
      expect(storageService.getApiBaseUrl()).toBe(DEFAULT_CONFIG.baseUrl);
    });

    it('saves and retrieves custom apiBaseUrl with in-memory cache', () => {
      storageService.setApiBaseUrl('https://api.archivo-editorial.test');
      expect(storageService.getApiBaseUrl()).toBe('https://api.archivo-editorial.test');
      expect(storageService.getConfig().apiKey).toBe('');
    });

    it('re-reads localStorage after resetCache()', () => {
      storageService.setApiBaseUrl('https://first.test');
      localStorage.setItem(
        'dokploy_config',
        JSON.stringify({ baseUrl: 'https://second.test', apiKey: '' })
      );
      expect(storageService.getApiBaseUrl()).toBe('https://first.test');
      storageService.resetCache();
      expect(storageService.getApiBaseUrl()).toBe('https://second.test');
    });
  });

  describe('Session', () => {
    it('saves, updates, and clears user session cleanly', () => {
      expect(storageService.getSession()).toBeNull();
      expect(storageService.getToken()).toBeNull();

      const session = {
        token: 'jwt.token.123',
        user: { id: 'u-1', username: 'admin', role: 'ADMIN' as const },
      };
      storageService.saveSession(session);

      expect(storageService.getSession()).toEqual(session);
      expect(storageService.getToken()).toBe('jwt.token.123');

      storageService.saveToken('jwt.token.456');
      expect(storageService.getToken()).toBe('jwt.token.456');

      storageService.updateSessionUser({ isActive: true });
      expect(storageService.getSession()?.user.isActive).toBe(true);

      storageService.saveSession(null);
      expect(storageService.getSession()).toBeNull();
    });
  });

  describe('UI Preferences', () => {
    it('persists explorer viewMode and theme preference', () => {
      expect(storageService.getViewMode()).toBe('grid');
      storageService.setViewMode('list');
      expect(storageService.getViewMode()).toBe('list');

      expect(storageService.getTheme()).toBe('system');
      storageService.setTheme('dark');
      expect(storageService.getTheme()).toBe('dark');
    });
  });
});
