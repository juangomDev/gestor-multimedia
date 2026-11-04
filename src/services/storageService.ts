import type { ClientConfig } from '../types/api';
import type { UserSession, User } from '../types/auth';
import type { ImageItem, TableItem, FolderItem } from '../types/media';

const STORAGE_KEYS = {
  CONFIG: 'dokploy_config',
  AUTH_SESSION: 'dokploy_auth_session',
  IMAGES: 'dokploy_images',
  TABLES: 'dokploy_tables',
  FOLDERS: 'dokploy_folders',
  ACTIVE_FOLDER: 'dokploy_active_folder',
  PROFILES: 'dokploy_created_profiles',
};

export const DEFAULT_CONFIG: ClientConfig = {
  baseUrl: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000',
  apiKey: import.meta.env?.VITE_API_KEY || 'mk_live_dev_test_api_key_12345',
};

export const storageService = {
  // Config
  getConfig(): ClientConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  },

  saveConfig(config: Partial<ClientConfig>): ClientConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    return updated;
  },

  // Auth Session
  getSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveSession(session: UserSession | null): void {
    if (!session) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    }
  },

  getToken(): string | null {
    const session = this.getSession();
    return session?.token || null;
  },

  saveToken(token: string): void {
    const current = this.getSession();
    if (current) {
      this.saveSession({ ...current, token });
    } else {
      this.saveSession({
        token,
        user: { id: '', username: '', role: 'COLLABORATOR' },
      });
    }
  },

  updateSessionUser(userData: Partial<UserSession['user']>): void {
    const current = this.getSession();
    if (current) {
      this.saveSession({
        ...current,
        user: {
          ...current.user,
          ...userData,
        },
      });
    }
  },

  // Images
  getImages(): ImageItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.IMAGES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveImages(images: ImageItem[]): void {
    localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(images));
  },

  addImage(image: ImageItem): void {
    const current = this.getImages();
    const updated = [image, ...current.filter((i) => i.id !== image.id && i.shortCode !== image.shortCode)];
    this.saveImages(updated);
  },

  removeImage(idOrShortCode: string): void {
    const current = this.getImages();
    this.saveImages(current.filter((i) => i.id !== idOrShortCode && i.shortCode !== idOrShortCode));
  },

  moveImageToFolder(idOrShortCode: string, folderId: string | null): void {
    const current = this.getImages();
    const updated = current.map((i) =>
      i.id === idOrShortCode || i.shortCode === idOrShortCode ? { ...i, folderId } : i
    );
    this.saveImages(updated);
  },

  // Tables
  getTables(): TableItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TABLES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveTables(tables: TableItem[]): void {
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
  },

  addTable(table: TableItem): void {
    const current = this.getTables();
    const updated = [table, ...current.filter((t) => t.id !== table.id && t.shortCode !== table.shortCode)];
    this.saveTables(updated);
  },

  removeTable(idOrShortCode: string): void {
    const current = this.getTables();
    this.saveTables(current.filter((t) => t.id !== idOrShortCode && t.shortCode !== idOrShortCode));
  },

  moveTableToFolder(idOrShortCode: string, folderId: string | null): void {
    const current = this.getTables();
    const updated = current.map((t) =>
      t.id === idOrShortCode || t.shortCode === idOrShortCode ? { ...t, folderId } : t
    );
    this.saveTables(updated);
  },

  // Folders
  getFolders(): FolderItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveFolders(folders: FolderItem[]): void {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  },

  addFolder(folder: FolderItem): void {
    const current = this.getFolders();
    this.saveFolders([...current.filter((f) => f.id !== folder.id), folder]);
  },

  removeFolder(id: string): void {
    const current = this.getFolders();
    this.saveFolders(current.filter((f) => f.id !== id));
  },

  // Active Folder
  getActiveFolderId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_FOLDER);
  },

  setActiveFolderId(folderId: string | null): void {
    if (!folderId) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_FOLDER);
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FOLDER, folderId);
    }
  },

  // Created User Profiles
  getCreatedUsers(): User[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveCreatedUsers(users: User[]): void {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(users));
  },

  addCreatedUser(user: User): void {
    const current = this.getCreatedUsers();
    const updated = [user, ...current.filter((u) => u.id !== user.id && u.username !== user.username)];
    this.saveCreatedUsers(updated);
  },

  removeCreatedUser(userIdOrUsername: string): void {
    const current = this.getCreatedUsers();
    this.saveCreatedUsers(current.filter((u) => u.id !== userIdOrUsername && u.username !== userIdOrUsername));
  },
};
