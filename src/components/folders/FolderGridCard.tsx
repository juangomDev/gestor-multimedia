import React from 'react';
import {
  Folder,
  FolderTree,
  Lock,
  Users,
  Share2,
  Pencil,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import type { FolderItem } from '../../types/media';
import styles from './FolderGridCard.module.css';

/**
 * Propiedades de la tarjeta de carpeta en cuadrícula (`FolderGridCard`).
 */
export interface FolderGridCardProps {
  folder: FolderItem;
  onOpenFolder: (folder: FolderItem) => void;
  onEditFolder?: (folder: FolderItem) => void;
  onShareFolder?: (folder: FolderItem) => void;
  onDeleteFolder?: (folder: FolderItem) => void;
}

/**
 * Tarjeta visual de carpeta que comparte la misma cuadrícula (`grid`) y proporciones
 * que las tarjetas de contenido (`ImageCard`, `TableCard`, `PdfCard`).
 */
export const FolderGridCard: React.FC<FolderGridCardProps> = ({
  folder,
  onOpenFolder,
  onEditFolder,
  onShareFolder,
  onDeleteFolder,
}) => {
  const { user: currentUser } = useAuth();

  const isSystemFolder =
    Boolean(folder.isSystem) ||
    folder.name.trim().toLowerCase() === 'general' ||
    folder.name.trim().toLowerCase() === 'shared';

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

  const typeLabel =
    folder.type === 'container'
      ? 'CONTENEDOR'
      : folder.type === 'table'
      ? 'TABLAS'
      : folder.type === 'pdf'
      ? 'PDF'
      : 'IMÁGENES';

  const folderColor = folder.color || '#3b82f6';

  return (
    <div
      className={styles.card}
      data-testid={`folder-grid-card-${folder.id}`}
    >
      <button
        type="button"
        onClick={() => onOpenFolder(folder)}
        style={{
          all: 'unset',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          cursor: 'pointer',
        }}
      >
        <div className={styles.previewWrapper} style={{ width: '100%' }}>
          <span className={styles.typeBadge}>
            {isSystemFolder && <ShieldCheck size={11} style={{ color: '#38bdf8' }} />}
            <span>{typeLabel}</span>
          </span>

          <div className={styles.statusBadges}>
            {folder.isPrivate && (
              <span title="Carpeta privada" aria-label="Carpeta privada">
                <Lock size={12} style={{ color: '#fbbf24' }} />
              </span>
            )}
            {isSharedFolder && (
              <span title="Carpeta compartida" aria-label="Carpeta compartida">
                <Users size={12} style={{ color: '#38bdf8' }} />
              </span>
            )}
            {folder.itemCount !== undefined && (
              <span className={styles.countPill}>{folder.itemCount}</span>
            )}
          </div>

          {folder.type === 'container' ? (
            <FolderTree
              size={42}
              style={{
                color: folderColor,
                fill: `${folderColor}24`,
              }}
            />
          ) : (
            <Folder
              size={42}
              style={{
                color: folderColor,
                fill: `${folderColor}28`,
              }}
            />
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.name} title={folder.name}>
            {folder.name}
          </span>
          <span className={styles.subLabel}>Carpeta</span>
        </div>
      </button>

      {isOwnerOrAdmin && (
        <div
          className={styles.overlayActions}
          onClick={(e) => e.stopPropagation()}
        >
          {onShareFolder && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={(e) => {
                e.stopPropagation();
                onShareFolder(folder);
              }}
              title={`Compartir ${folder.name}`}
              aria-label={`Compartir carpeta ${folder.name}`}
            >
              <Share2 size={12} />
            </button>
          )}
          {!isSystemFolder && onEditFolder && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={(e) => {
                e.stopPropagation();
                onEditFolder(folder);
              }}
              title={`Editar ${folder.name}`}
              aria-label={`Editar carpeta ${folder.name}`}
            >
              <Pencil size={12} />
            </button>
          )}
          {!isSystemFolder && onDeleteFolder && (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(folder);
              }}
              title={`Eliminar ${folder.name}`}
              aria-label={`Eliminar carpeta ${folder.name}`}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

