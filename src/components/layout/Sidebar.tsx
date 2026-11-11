import React from 'react';
import {
  Image, Table2, Upload, Settings, RefreshCw, LogOut, Users,
  KeyRound, Sparkles, ShieldCheck, FileText, FileSpreadsheet, FolderKanban,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { SidebarFoldersTree } from '../folders/SidebarFoldersTree';
import type { FolderItem } from '../../types/media';
import styles from './Sidebar.module.css';

/**
 * Tipos de vista admitidos en el espacio de trabajo.
 */
export type WorkspaceView =
  | 'all' | 'images' | 'tables' | 'pdfs' | 'forms'
  | 'chat' | 'profiles' | 'login' | 'settings' | 'audit';

/**
 * Propiedades del componente de navegación lateral `Sidebar`.
 */
export interface SidebarProps {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  onOpenUpload: () => void;
  onSync: () => void;
  imagesCount: number;
  tablesCount: number;
  pdfsCount?: number;
  formsCount?: number;
  totalBytes?: number;
  folders?: FolderItem[];
  activeFolderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
  onOpenNewFolder?: () => void;
  onEditFolder?: (folder: FolderItem) => void;
  onShareFolder?: (folder: FolderItem) => void;
  onDeleteFolder?: (folder: FolderItem) => void;
  foldersEnabled?: boolean;
  /** Activa el modo compacto de explorador unificado (sin medios en menú lateral y configuración exclusiva ADMIN). */
  explorerMode?: boolean;
  onOpenChangePassword?: () => void;
}

/**
 * Barra lateral de navegación principal optimizada.
 * En `explorerMode`, expone el botón de subida, el acceso al Explorador y Data Chat,
 * y restringe la sección de Configuración exclusivamente al rol `ADMIN`.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  activeView, onViewChange, onOpenUpload, onSync,
  imagesCount, tablesCount, pdfsCount = 0, formsCount = 0,
  folders = [], activeFolderId = null, onFolderChange,
  onOpenNewFolder, onEditFolder, onShareFolder, onDeleteFolder,
  foldersEnabled = false, explorerMode = false, onOpenChangePassword,
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const isAdmin = user?.role === 'ADMIN';
  const showConfigSection = explorerMode ? isAdmin : true;
  const canManageProfiles = explorerMode
    ? isAdmin
    : user ? user.role === 'ADMIN' || user.role === 'MANAGER' : false;
  const canViewAudit = explorerMode
    ? isAdmin
    : user ? user.role === 'ADMIN' || user.role === 'MANAGER' : false;

  /**
   * Cierra la sesión activa en el servidor y redirige a la vista de login.
   */
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

  const isExplorerActive =
    activeView === 'all' || activeView === 'images' || activeView === 'tables' ||
    activeView === 'pdfs' || activeView === 'forms';

  const currentMediaCategory =
    activeView === 'tables' ? 'table' : activeView === 'pdfs' ? 'pdf' : 'image';
  const showFoldersSection =
    !explorerMode && foldersEnabled &&
    (activeView === 'images' || activeView === 'tables' || activeView === 'pdfs');

  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;
  const uploadButtonLabel =
    activeFolder?.type === 'image' ? 'Subir Imagen' :
    activeFolder?.type === 'table' ? 'Subir Tabla' :
    activeFolder?.type === 'pdf' ? 'Subir PDF' : 'Subir Archivo';

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topSection}>
        <div
          className={styles.header}
          onClick={() => { onFolderChange?.(null); onViewChange('all'); }}
          style={{ cursor: 'pointer' }}
          title="Ir al Explorador Principal"
        >
          <span className={styles.brandTitle}>Multimedia</span>
          <span className={styles.badgeSaaS}>Studio</span>
        </div>

        <button onClick={onOpenUpload} className={styles.uploadBtn}>
          <Upload size={15} />
          <span>{uploadButtonLabel}</span>
        </button>

        <div className={styles.navGroup}>
          <span className={styles.navTitle}>Espacios</span>

          {explorerMode ? (
            <button
              onClick={() => { onFolderChange?.(null); onViewChange('all'); }}
              className={`${styles.navItem} ${isExplorerActive ? styles.active : ''}`}
            >
              <div className={styles.itemLabel}>
                <FolderKanban size={16} />
                <span>Explorador Principal</span>
              </div>
            </button>
          ) : (
            <>
              <button
                onClick={() => onViewChange('images')}
                className={`${styles.navItem} ${activeView === 'images' ? styles.active : ''}`}
              >
                <div className={styles.itemLabel}>
                  <Image size={16} />
                  <span>Galería de Imágenes</span>
                </div>
                <span className={styles.badgeCount}>{imagesCount}</span>
              </button>

              <button
                onClick={() => onViewChange('tables')}
                className={`${styles.navItem} ${activeView === 'tables' ? styles.active : ''}`}
              >
                <div className={styles.itemLabel}>
                  <Table2 size={16} />
                  <span>Data Studio (Tablas)</span>
                </div>
                <span className={styles.badgeCount}>{tablesCount}</span>
              </button>

              <button
                onClick={() => onViewChange('pdfs')}
                className={`${styles.navItem} ${activeView === 'pdfs' ? styles.active : ''}`}
              >
                <div className={styles.itemLabel}>
                  <FileText size={16} />
                  <span>Documentos PDF</span>
                </div>
                <span className={styles.badgeCount}>{pdfsCount}</span>
              </button>

              <button
                onClick={() => onViewChange('forms')}
                className={`${styles.navItem} ${activeView === 'forms' ? styles.active : ''}`}
              >
                <div className={styles.itemLabel}>
                  <FileSpreadsheet size={16} />
                  <span>Formularios</span>
                </div>
                {formsCount > 0 && <span className={styles.badgeCount}>{formsCount}</span>}
              </button>
            </>
          )}

          <button
            onClick={() => onViewChange('chat')}
            className={`${styles.navItem} ${activeView === 'chat' ? styles.active : ''}`}
          >
            <div className={styles.itemLabel}>
              <Sparkles size={16} />
              <span>Consulta Inteligente (Data Chat)</span>
            </div>
          </button>
        </div>

        {showFoldersSection && (
          <SidebarFoldersTree
            folders={folders}
            currentMediaCategory={currentMediaCategory}
            activeFolderId={activeFolderId}
            onFolderChange={onFolderChange}
            onOpenNewFolder={onOpenNewFolder}
            onEditFolder={onEditFolder}
            onShareFolder={onShareFolder}
            onDeleteFolder={onDeleteFolder}
          />
        )}

        {showConfigSection && (
          <div className={styles.navGroup}>
            <span className={styles.navTitle}>Configuración (Admin)</span>

            <button
              onClick={() => onViewChange('settings')}
              className={`${styles.navItem} ${activeView === 'settings' ? styles.active : ''}`}
            >
              <div className={styles.itemLabel}>
                <Settings size={16} />
                <span>Configuración API</span>
              </div>
            </button>

            <button onClick={onSync} className={styles.navItem}>
              <div className={styles.itemLabel}>
                <RefreshCw size={16} />
                <span>Sincronizar Base de Datos</span>
              </div>
            </button>

            {canManageProfiles && (
              <button
                onClick={() => onViewChange('profiles')}
                className={`${styles.navItem} ${activeView === 'profiles' ? styles.active : ''}`}
              >
                <div className={styles.itemLabel}>
                  <Users size={16} />
                  <span>Gestión de Perfiles</span>
                </div>
              </button>
            )}

            {canViewAudit && (
              <button
                onClick={() => onViewChange('audit')}
                className={`${styles.navItem} ${activeView === 'audit' ? styles.active : ''}`}
              >
                <div className={styles.itemLabel}>
                  <ShieldCheck size={16} />
                  <span>Registro de Auditoría</span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

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
              <button type="button" onClick={onOpenChangePassword} className={styles.actionBtn} title="Cambiar Contraseña" aria-label="Cambiar contraseña">
                <KeyRound size={14} />
              </button>
            )}
            <button type="button" onClick={handleLogoutClick} className={styles.logoutBtn} title="Cerrar Sesión" aria-label="Cerrar sesión">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
