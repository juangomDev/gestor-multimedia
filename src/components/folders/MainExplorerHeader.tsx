import React from 'react';
import {
  Folder, FolderPlus, FolderRoot, ChevronRight, Lock, Users,
  Share2, Pencil, Trash2, X, Image, Table2, FileText, FileSpreadsheet, LayoutGrid,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { NotificationBell } from '../notifications/NotificationBell';
import type { FolderItem } from '../../types/media';
import type { WorkspaceView } from '../layout/Sidebar';
import styles from './MainExplorerHeader.module.css';

/**
 * Propiedades del encabezado y explorador de carpetas del área principal (`main`).
 */
export interface MainExplorerHeaderProps {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  folders: FolderItem[];
  activeFolder: FolderItem | null;
  activeFolderId: string | null;
  onFolderChange: (folderId: string | null) => void;
  onOpenNewFolder: () => void;
  onEditFolder: (folder: FolderItem) => void;
  onShareFolder: (folder: FolderItem) => void;
  onDeleteFolder: (folder: FolderItem) => void;
  imagesCount: number;
  tablesCount: number;
  pdfsCount: number;
  formsCount?: number;
  compactHeaderOnly?: boolean;
}

/**
 * Barra superior y cuadrícula de carpetas integrada en `<main>`.
 * En modo `compactHeaderOnly` muestra únicamente la ruta jerárquica (breadcrumbs) y el botón de crear carpeta/subcarpeta,
 * dejando que las carpetas compartan la cuadrícula principal con el contenido.
 */
export const MainExplorerHeader: React.FC<MainExplorerHeaderProps> = ({
  activeView, onViewChange, folders, activeFolder, activeFolderId,
  onFolderChange, onOpenNewFolder, onEditFolder, onShareFolder, onDeleteFolder,
  imagesCount, tablesCount, pdfsCount, formsCount = 0, compactHeaderOnly = false,
}) => {
  const { user: currentUser } = useAuth();

  const breadcrumbChain = React.useMemo(() => {
    const chain: FolderItem[] = [];
    let current = activeFolder;
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.unshift(current);
      current = current.parentId ? folders.find((f) => f.id === current!.parentId) || null : null;
    }
    return chain;
  }, [activeFolder, folders]);

  const visibleFolders = React.useMemo(() => {
    if (compactHeaderOnly) return [];
    if (activeView === 'forms') return [];
    if (activeView === 'all') return folders;
    const targetCategory =
      activeView === 'tables' ? 'table' : activeView === 'pdfs' ? 'pdf' : 'image';
    return folders.filter((f) => String(f.type).toLowerCase() === targetCategory);
  }, [folders, activeView, compactHeaderOnly]);

  /**
   * Selecciona una carpeta y sincroniza la vista con la categoría de la carpeta.
   */
  const handleSelectFolder = (folder: FolderItem) => {
    if (activeFolderId === folder.id && !compactHeaderOnly) {
      onFolderChange(null);
      return;
    }
    const targetView: WorkspaceView =
      compactHeaderOnly && activeView === 'all'
        ? 'all'
        : folder.type === 'container'
        ? 'all'
        : folder.type === 'table'
        ? 'tables'
        : folder.type === 'pdf'
        ? 'pdfs'
        : 'images';
    if (activeView !== targetView) onViewChange(targetView);
    onFolderChange(folder.id);
  };

  const totalAssets = imagesCount + tablesCount + pdfsCount + formsCount;
  const canCreateFolderHere = breadcrumbChain.length < 3;

  return (
    <div className={styles.wrapper} data-testid="main-explorer-header">
      <div className={styles.topBar}>
        <div className={styles.breadcrumbs}>
          <button
            type="button"
            onClick={() => {
              onFolderChange(null);
              if (compactHeaderOnly) onViewChange('all');
            }}
            className={`${styles.rootCrumb} ${!activeFolder ? styles.rootCrumbActive : ''}`}
            title="Ver todas las carpetas (Raíz)"
          >
            <FolderRoot size={15} />
            <span>Explorador</span>
          </button>

          {breadcrumbChain.map((crumb, idx) => {
            const isLast = idx === breadcrumbChain.length - 1;
            const parentId = crumb.parentId || null;
            return (
              <React.Fragment key={crumb.id}>
                <ChevronRight size={13} className={styles.crumbSep} />
                {isLast ? (
                  <div className={styles.activeFolderCrumb}>
                    <Folder
                      size={13}
                      style={{ color: crumb.color || 'var(--accent-primary)', flexShrink: 0 }}
                    />
                    <span>{crumb.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const parentFolder = parentId ? folders.find((f) => f.id === parentId) : null;
                        if (parentFolder) handleSelectFolder(parentFolder);
                        else {
                          onFolderChange(null);
                          if (compactHeaderOnly) onViewChange('all');
                        }
                      }}
                      className={styles.clearFolderBtn}
                      title="Subir un nivel"
                      aria-label="Salir de la carpeta"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectFolder(crumb)}
                    className={styles.rootCrumb}
                  >
                    <Folder size={13} style={{ color: crumb.color || 'var(--accent-primary)' }} />
                    <span>{crumb.name}</span>
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div
          className={styles.filterGroup}
          role="navigation"
          aria-label="Filtros del explorador"
          style={
            compactHeaderOnly
              ? { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }
              : undefined
          }
        >
          {([
            { id: 'all', label: 'Todo', count: totalAssets, Icon: LayoutGrid },
            { id: 'images', label: 'Galería de Imágenes', count: imagesCount, Icon: Image },
            { id: 'tables', label: 'Data Studio (Tablas)', count: tablesCount, Icon: Table2 },
            { id: 'pdfs', label: 'Documentos PDF', count: pdfsCount, Icon: FileText },
            { id: 'forms', label: 'Formularios', count: formsCount, Icon: FileSpreadsheet },
          ] as const).map(({ id, label, count, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              className={`${styles.filterPill} ${activeView === id ? styles.filterPillActive : ''}`}
            >
              <Icon size={13} />
              <span>{label}</span>
              {(id !== 'forms' || count > 0) && <span className={styles.pillCount}>{count}</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {compactHeaderOnly && activeFolder?.type === 'table' && (
            <button
              type="button"
              onClick={() => onViewChange(activeView === 'forms' ? 'tables' : 'forms')}
              className={styles.filterPill}
            >
              <FileSpreadsheet size={13} />
              <span>{activeView === 'forms' ? 'Ver Tablas' : 'Formularios de esta carpeta'}</span>
            </button>
          )}
          <NotificationBell onNavigateToForms={() => onViewChange('forms')} />
          <button
            type="button"
            onClick={canCreateFolderHere ? onOpenNewFolder : undefined}
            disabled={!canCreateFolderHere}
            className={styles.newFolderBtn}
            style={!canCreateFolderHere ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
            title={!canCreateFolderHere ? 'Profundidad máxima de 3 niveles alcanzada' : undefined}
            aria-label="Nueva carpeta"
          >
            <FolderPlus size={14} />
            <span>{activeFolder ? 'Nueva subcarpeta' : 'Nueva carpeta'}</span>
          </button>
        </div>
      </div>

      {visibleFolders.length > 0 && (
        <div className={styles.foldersSection} data-testid="main-folders-section">
          <div className={styles.foldersGrid}>
            {visibleFolders.map((folder) => {
              const lowerName = folder.name.trim().toLowerCase();
              const isSystemFolder = Boolean(folder.isSystem) || lowerName === 'general' || lowerName === 'shared';
              const isSystemShared = Boolean(folder.isSystem) || lowerName === 'shared';
              const isOwnerOrAdmin =
                currentUser?.role === 'ADMIN' || folder.myPermission === 'ADMIN' ||
                !folder.userId || folder.userId === currentUser?.id;
              const isSharedFolder =
                Boolean(folder.isShared) || Boolean(folder.userId && currentUser && folder.userId !== currentUser.id) ||
                folder.myPermission === 'READ' || folder.myPermission === 'EDIT';
              const typeBadgeLabel =
                isSystemShared ? 'Sistema · Compartida' :
                folder.type === 'container' ? 'DIR' : folder.type === 'table' ? 'TAB' : folder.type === 'pdf' ? 'PDF' : 'IMG';

              return (
                <div key={folder.id} className={`${styles.folderCard} ${activeFolderId === folder.id ? styles.folderCardActive : ''}`}>
                  <button type="button" onClick={() => handleSelectFolder(folder)} className={styles.folderSelectBtn}>
                    <div className={styles.folderTitleGroup}>
                      <Folder
                        size={15}
                        style={{ color: folder.color || '#3b82f6', fill: folder.color ? `${folder.color}28` : undefined, flexShrink: 0 }}
                      />
                      <span className={styles.folderName}>{folder.name}</span>
                    </div>
                    <div className={styles.folderMeta}>
                      {(activeView === 'all' || isSystemShared) && <span className={styles.typeBadge}>{typeBadgeLabel}</span>}
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
                      {folder.itemCount !== undefined && <span className={styles.countBadge}>{folder.itemCount}</span>}
                    </div>
                  </button>

                  {isOwnerOrAdmin && (
                    <div className={styles.folderActions}>
                      <button type="button" onClick={() => onShareFolder(folder)} className={styles.miniBtn} title={`Compartir ${folder.name}`} aria-label={`Compartir carpeta ${folder.name}`}>
                        <Share2 size={11} />
                      </button>
                      {!isSystemFolder && (
                        <>
                          <button type="button" onClick={() => onEditFolder(folder)} className={styles.miniBtn} title={`Editar ${folder.name}`} aria-label={`Editar carpeta ${folder.name}`}>
                            <Pencil size={11} />
                          </button>
                          <button type="button" onClick={() => onDeleteFolder(folder)} className={styles.miniBtn} style={{ color: 'var(--color-danger)' }} title={`Eliminar ${folder.name}`} aria-label={`Eliminar carpeta ${folder.name}`}>
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
