import React from 'react';
import { Image, Table2, Upload, Settings, FileCode2, RefreshCw, LogOut, Users } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';
import { HealthBadge } from '../health/HealthBadge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { FolderItem } from '../../types/media';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  activeView: 'images' | 'tables' | 'profiles' | 'login';
  onViewChange: (view: 'images' | 'tables' | 'profiles' | 'login') => void;
  onOpenUpload: () => void;
  onOpenConfig: () => void;
  onOpenImport: () => void;
  onSync: () => void;
  imagesCount: number;
  tablesCount: number;
  totalBytes: number;
  folders?: FolderItem[];
  activeFolderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
  onOpenNewFolder?: () => void;
  foldersEnabled?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  onOpenUpload,
  onOpenConfig,
  onOpenImport,
  onSync,
  imagesCount,
  tablesCount,
  totalBytes,
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const isEffectiveAdmin = user ? user.role === 'ADMIN' : true;

  const maxStorageBytes = 50 * 1024 * 1024 * 1024; // 50 GB
  const percentage = Math.min(100, (totalBytes / maxStorageBytes) * 100);

  const handleLogoutClick = () => {
    logout();
    onViewChange('login');
    showToast('Sesión cerrada. Redirigiendo a pantalla de login...', 'info');
  };

  const displayName = user?.username || 'Admin';
  const displayRole = user?.role ? `${user.role.toLowerCase()}@multimedia.local` : 'admin@dokploy.local';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topSection}>
        {/* Simple minimal header requested by user: "Multimedia" */}
        <div className={styles.header}>
          <span className={styles.brandTitle}>Multimedia</span>
          <span className={styles.badgeSaaS}>Studio</span>
        </div>

        {/* Primary Action Button */}
        <button onClick={onOpenUpload} className={styles.uploadBtn}>
          <Upload size={16} />
          <span>Subir Archivo</span>
        </button>

        {/* Espacios de Trabajo */}
        <div className={styles.navGroup}>
          <span className={styles.navTitle}>Espacios</span>

          <button
            onClick={() => onViewChange('images')}
            className={`${styles.navItem} ${activeView === 'images' ? styles.active : ''}`}
          >
            <div className={styles.itemLabel}>
              <Image size={17} />
              <span>Galería de Imágenes</span>
            </div>
            <span className={styles.badgeCount}>{imagesCount}</span>
          </button>

          <button
            onClick={() => onViewChange('tables')}
            className={`${styles.navItem} ${activeView === 'tables' ? styles.active : ''}`}
          >
            <div className={styles.itemLabel}>
              <Table2 size={17} />
              <span>Data Studio (Tablas)</span>
            </div>
            <span className={styles.badgeCount}>{tablesCount}</span>
          </button>
        </div>

        {/* Configuración & Herramientas */}
        <div className={styles.navGroup}>
          <span className={styles.navTitle}>Configuración</span>

          <button onClick={onOpenConfig} className={styles.navItem}>
            <div className={styles.itemLabel}>
              <Settings size={17} />
              <span>Configuración API</span>
            </div>
          </button>

          <button onClick={onOpenImport} className={styles.navItem}>
            <div className={styles.itemLabel}>
              <FileCode2 size={17} />
              <span>Importar por Código</span>
            </div>
          </button>

          <button onClick={onSync} className={styles.navItem}>
            <div className={styles.itemLabel}>
              <RefreshCw size={17} />
              <span>Sincronizar Base de Datos</span>
            </div>
          </button>

          {isEffectiveAdmin && (
            <button
              onClick={() => onViewChange('profiles')}
              className={`${styles.navItem} ${activeView === 'profiles' ? styles.active : ''}`}
            >
              <div className={styles.itemLabel}>
                <Users size={17} />
                <span>Gestión de Perfiles</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Section: Health, Storage, Account & Logout */}
      <div className={styles.bottomSection}>
        {/* API Health: Discreet, subtle, not flashy at bottom */}
        <div className={styles.healthRow}>
          <HealthBadge size="sm" />
        </div>

        {/* Storage Widget */}
        <div className={styles.storageWidget}>
          <div className={styles.storageHeader}>
            <span>Almacenamiento</span>
            <span style={{ fontWeight: 600 }}>{formatBytes(totalBytes)} / 50 GB</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.max(2, percentage)}%` }}
            />
          </div>
        </div>

        {/* User Account & Logout Card */}
        <div className={styles.userAccountCard}>
          <div className={styles.userInfoGroup}>
            <div className={styles.avatarCircle}>{initials}</div>
            <div className={styles.userText}>
              <span className={styles.accountName}>{displayName}</span>
              <span className={styles.accountSub}>{displayRole}</span>
            </div>
          </div>

          <button
            onClick={handleLogoutClick}
            className={styles.logoutBtn}
            title="Cerrar Sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>

        <div className={styles.versionTag}>Version v0.30.10</div>
      </div>
    </aside>
  );
};
