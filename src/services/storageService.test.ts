import { describe, it, expect, beforeEach } from 'vitest';
import { storageService, DEFAULT_CONFIG } from './storageService';
import type { ImageItem, TableItem, FolderItem } from '../types/media';

describe('storageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Config', () => {
    it('returns DEFAULT_CONFIG when empty', () => {
      expect(storageService.getConfig()).toEqual(DEFAULT_CONFIG);
    });

    it('saves and merges updated config', () => {
      storageService.saveConfig({ baseUrl: 'http://custom-host:8080' });
      const config = storageService.getConfig();
      expect(config.baseUrl).toBe('http://custom-host:8080');
      expect(config.apiKey).toBe(DEFAULT_CONFIG.apiKey);
    });
  });

  describe('Session', () => {
    it('saves and retrieves user session', () => {
      expect(storageService.getSession()).toBeNull();
      expect(storageService.getToken()).toBeNull();

      const session = {
        token: 'jwt.token.123',
        user: { id: 'u-1', username: 'admin', role: 'ADMIN' as const },
      };
      storageService.saveSession(session);

      expect(storageService.getSession()).toEqual(session);
      expect(storageService.getToken()).toBe('jwt.token.123');

      storageService.saveSession(null);
      expect(storageService.getSession()).toBeNull();
    });
  });

  describe('Images', () => {
    it('adds, retrieves, and removes images', () => {
      const img: ImageItem = {
        id: 'img-1',
        shortCode: 'abc12345',
        originalName: 'foto.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        url: 'http://localhost:3000/i/abc12345',
        createdAt: new Date().toISOString(),
      };

      storageService.addImage(img);
      expect(storageService.getImages()).toHaveLength(1);
      expect(storageService.getImages()[0].shortCode).toBe('abc12345');

      storageService.removeImage('abc12345');
      expect(storageService.getImages()).toHaveLength(0);
    });

    it('moves image to another folder or back to root', () => {
      const img: ImageItem = {
        id: 'img-1',
        shortCode: 'abc12345',
        originalName: 'foto.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        url: 'http://localhost:3000/i/abc12345',
        createdAt: new Date().toISOString(),
      };
      storageService.addImage(img);
      storageService.moveImageToFolder('img-1', 'folder-target');
      expect(storageService.getImages()[0].folderId).toBe('folder-target');
      storageService.moveImageToFolder('img-1', null);
      expect(storageService.getImages()[0].folderId).toBeNull();
    });
  });

  describe('Tables', () => {
    it('adds, retrieves, and removes tables', () => {
      const table: TableItem = {
        id: 'tab-1',
        shortCode: 'tbl999',
        tableName: 'reporte.csv',
        rowCount: 100,
        sizeBytes: 4096,
        url: 'http://localhost:3000/t/tbl999',
        createdAt: new Date().toISOString(),
      };

      storageService.addTable(table);
      expect(storageService.getTables()).toHaveLength(1);
      expect(storageService.getTables()[0].tableName).toBe('reporte.csv');

      storageService.removeTable('tab-1');
      expect(storageService.getTables()).toHaveLength(0);
    });

    it('moves table to another folder or back to root', () => {
      const table: TableItem = {
        id: 'tab-1',
        shortCode: 'tbl999',
        tableName: 'reporte.csv',
        rowCount: 100,
        sizeBytes: 4096,
        url: 'http://localhost:3000/t/tbl999',
        createdAt: new Date().toISOString(),
      };
      storageService.addTable(table);
      storageService.moveTableToFolder('tbl999', 'folder-tables');
      expect(storageService.getTables()[0].folderId).toBe('folder-tables');
    });
  });

  describe('Folders', () => {
    it('creates, lists, and removes folders and activeFolderId', () => {
      const folder: FolderItem = {
        id: 'fld-1',
        name: 'Proyecto Alfa',
        type: 'image',
        color: '#3b82f6',
        createdAt: new Date().toISOString(),
      };

      storageService.addFolder(folder);
      expect(storageService.getFolders()).toHaveLength(1);
      expect(storageService.getFolders()[0].name).toBe('Proyecto Alfa');

      storageService.setActiveFolderId('fld-1');
      expect(storageService.getActiveFolderId()).toBe('fld-1');

      storageService.removeFolder('fld-1');
      expect(storageService.getFolders()).toHaveLength(0);

      storageService.setActiveFolderId(null);
      expect(storageService.getActiveFolderId()).toBeNull();
    });
  });
});
