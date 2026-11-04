import React from 'react';
import { Image, Table2, Upload, Settings, RefreshCw, LogOut, Users, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import type { FolderItem } from '../../types/media';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  activeView: 'images' | 'tables' | 'profiles' | 'login' | 'settings';
  onViewChange: (view: 'images' | 'tables' | 'profiles' | 'login' | 'settings') => void;
  onOpenUpload: () => void;
  onSync: () => void;
  imagesCount: number;
  tablesCount: number;
  totalBytes?: number;
  folders?: FolderItem[];
  activeFolderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
  onOpenNewFolder?: () => void;
  foldersEnabled?: boolean;
  onOpenChangePassword?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  onOpenUpload,
  onSync,
  imagesCount,
  tablesCount,
  onOpenChangePassword,
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const isEffectiveAdmin = user ? user.role === 'ADMIN' : true;

  const handleLogoutClick = async () => {
    try {
      await logout();
      onViewChange('login');
      showToast('Sesión cerrada exitosamente en el servidor', 'info');
    } catch {
      onViewChange('login');
      showToast('Sesión local cerrada', 'info');
    }
  };

  const displayName = user?.username || 'Admin';
  const roleName = user?.role || 'ADMIN';
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

          <button
            onClick={() => onViewChange('settings')}
            className={`${styles.navItem} ${activeView === 'settings' ? styles.active : ''}`}
          >
            <div className={styles.itemLabel}>
              <Settings size={17} />
              <span>Configuración API</span>
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

      {/* Bottom Section: User Account & Logout Card */}
      <div className={styles.bottomSection}>
        <div className={styles.userAccountCard}>
          <div className={styles.userInfoGroup}>
            <div className={styles.avatarCircle}>{initials}</div>
            <div className={styles.userText}>
              <span className={styles.accountName}>{displayName}</span>
              <span
                className={`${styles.roleBadge} ${
                  roleName === 'ADMIN'
                    ? styles.roleAdmin
                    : roleName === 'MANAGER'
                    ? styles.roleManager
                    : styles.roleCollaborator
                }`}
              >
                {roleName}
              </span>
            </div>
          </div>

          <div className={styles.userActionsGroup}>
            {onOpenChangePassword && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                className={styles.actionBtn}
                title="Cambiar Contraseña"
                aria-label="Cambiar contraseña"
              >
                <KeyRound size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={handleLogoutClick}
              className={styles.logoutBtn}
              title="Cerrar Sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
