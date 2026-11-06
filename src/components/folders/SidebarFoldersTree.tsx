import React from 'react';
import {
  Folder,
  FolderPlus,
  FolderRoot,
  Lock,
  Users,
  Share2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import type { FolderItem, MediaCategory } from '../../types/media';
import styles from './SidebarFoldersTree.module.css';

/**
 * Propiedades del árbol de carpetas lateral sincronizado con PostgreSQL.
 */
export interface SidebarFoldersTreeProps {
  folders: FolderItem[];
  currentMediaCategory: MediaCategory;
  activeFolderId: string | null;
  onFolderChange?: (folderId: string | null) => void;
  onOpenNewFolder?: () => void;
  onEditFolder?: (folder: FolderItem) => void;
  onShareFolder?: (folder: FolderItem) => void;
  onDeleteFolder?: (folder: FolderItem) => void;
}

/**
 * Renderiza el árbol de carpetas de PostgreSQL filtrado por categoría (`image` o `table`),
 * mostrando badges de privacidad (`isPrivate`), compartición, permisos (`Lectura` / `Edición`),
 * contador `itemCount` y protección sobre la carpeta del sistema `General`.
 */
export const SidebarFoldersTree: React.FC<SidebarFoldersTreeProps> = ({
  folders,
  currentMediaCategory,
  activeFolderId,
  onFolderChange,
  onOpenNewFolder,
  onEditFolder,
  onShareFolder,
  onDeleteFolder,
}) => {
  const { user: currentUser } = useAuth();

  const visibleFolders = folders.filter(
    (f) => String(f.type).toLowerCase() === currentMediaCategory
  );

  return (
    <div className={styles.navGroup} data-testid="sidebar-folders-section">
      <div className={styles.navTitleRow}>
        <span className={styles.navTitle}>Carpetas</span>
        {onOpenNewFolder && (
          <button
            type="button"
            onClick={onOpenNewFolder}
            className={styles.newFolderBtn}
            title="Crear nueva carpeta"
            aria-label="Nueva carpeta"
          >
            <FolderPlus size={12} />
            <span>Nueva</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onFolderChange?.(null)}
        className={`${styles.navItem} ${activeFolderId === null ? styles.active : ''}`}
      >
        <div className={styles.itemLabel}>
          <FolderRoot size={15} />
          <span>Todas (Raíz)</span>
        </div>
      </button>

      {visibleFolders.map((folder) => {
        const isSystemGeneral = folder.name.trim().toLowerCase() === 'general';
        const isOwnerOrAdmin =
          currentUser?.role === 'ADMIN' ||
          folder.myPermission === 'ADMIN' ||
          !folder.userId ||
          folder.userId === currentUser?.id;

        const isSharedFolder =
          Boolean(folder.isShared) ||
          Boolean(folder.userId && currentUser && folder.userId !== currentUser.id) ||
          folder.myPermission === 'READ' ||
          folder.myPermission === 'EDIT';

        const permissionLabel =
          folder.myPermission === 'READ'
            ? 'Lectura'
            : folder.myPermission === 'EDIT'
            ? 'Edición'
            : null;

        return (
          <div key={folder.id} className={styles.folderRow}>
            <button
              type="button"
              onClick={() => onFolderChange?.(folder.id)}
              className={`${styles.navItem} ${activeFolderId === folder.id ? styles.active : ''}`}
            >
              <div className={styles.itemLabel}>
                <span
                  className={styles.folderDot}
                  style={{ backgroundColor: folder.color || '#3b82f6' }}
                />
                <Folder size={15} style={{ flexShrink: 0 }} />
                <span className={styles.folderName}>{folder.name}</span>
              </div>

              <div className={styles.badgesGroup}>
                {folder.isPrivate && (
                  <span title="Carpeta privada" aria-label="Carpeta privada">
                    <Lock size={11} style={{ color: '#fbbf24' }} />
                  </span>
                )}
                {isSharedFolder && (
                  <span title="Carpeta compartida" aria-label="Carpeta compartida">
                    <Users size={11} style={{ color: '#38bdf8' }} />
                  </span>
                )}
                {permissionLabel && (
                  <span className={styles.permBadge}>{permissionLabel}</span>
                )}
                {folder.itemCount !== undefined && (
                  <span className={styles.badgeCount}>{folder.itemCount}</span>
                )}
              </div>
            </button>

            <div className={styles.rowActions}>
              {onShareFolder && isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => onShareFolder(folder)}
                  className={styles.miniIconBtn}
                  title={`Compartir ${folder.name}`}
                  aria-label={`Compartir carpeta ${folder.name}`}
                >
                  <Share2 size={12} />
                </button>
              )}
              {onEditFolder && !isSystemGeneral && isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => onEditFolder(folder)}
                  className={styles.miniIconBtn}
                  title={`Editar ${folder.name}`}
                  aria-label={`Editar carpeta ${folder.name}`}
                >
                  <Pencil size={12} />
                </button>
              )}
              {onDeleteFolder && !isSystemGeneral && isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => onDeleteFolder(folder)}
                  className={styles.miniIconBtn}
                  style={{ color: 'var(--color-danger)' }}
                  title={`Eliminar ${folder.name}`}
                  aria-label={`Eliminar carpeta ${folder.name}`}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

