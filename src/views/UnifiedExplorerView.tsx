import React, { useMemo } from 'react';
import { Search, FolderPlus, FolderOpen, X } from 'lucide-react';
import { FolderGridCard } from '../components/folders/FolderGridCard';
import { ImageCard } from '../components/images/ImageCard';
import { TableCard } from '../components/tables/TableCard';
import { Button } from '../components/common/Button';
import type { ImageItem, TableItem, FolderItem } from '../types/media';
import type { WorkspaceView } from '../components/layout/Sidebar';
import styles from './ImagesView.module.css';

/**
 * Propiedades de la vista de Explorador Principal (Raíz y Carpetas Contenedoras).
 */
export interface UnifiedExplorerViewProps {
  folders?: FolderItem[];
  activeFolder?: FolderItem | null;
  images: ImageItem[];
  tables: TableItem[];
  pdfsCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenUpload: () => void;
  onOpenNewFolder?: () => void;
  onOpenFolder?: (folder: FolderItem) => void;
  onEditFolder?: (folder: FolderItem) => void;
  onShareFolder?: (folder: FolderItem) => void;
  onDeleteFolder?: (folder: FolderItem) => void;
  onDeleteImage: (img: ImageItem) => void;
  onDeleteTable: (tbl: TableItem) => void;
  onOpenStudio: (tbl: TableItem) => void;
  onMoveImageToFolder?: (img: ImageItem) => void;
  onMoveTableToFolder?: (tbl: TableItem) => void;
  onViewChange: (view: WorkspaceView) => void;
}

/**
 * Vista de Explorador Principal donde las carpetas y el contenido comparten la misma cuadrícula.
 * Dentro de una carpeta `container` solo se muestran subcarpetas; en la raíz se muestran las carpetas raíz
 * junto con los archivos sin carpeta asignada.
 */
export const UnifiedExplorerView: React.FC<UnifiedExplorerViewProps> = ({
  folders = [],
  activeFolder = null,
  images,
  tables,
  searchQuery,
  onSearchChange,
  onOpenNewFolder,
  onOpenFolder,
  onEditFolder,
  onShareFolder,
  onDeleteFolder,
  onDeleteImage,
  onDeleteTable,
  onOpenStudio,
  onMoveImageToFolder,
  onMoveTableToFolder,
}) => {
  const isContainerFolder = activeFolder?.type === 'container';

  const currentFolders = useMemo(() => {
    const parentId = activeFolder ? activeFolder.id : null;
    const byParent = folders.filter((f) => (f.parentId ?? null) === parentId);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byParent;
    return byParent.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, activeFolder, searchQuery]);

  const rootImages = useMemo(() => {
    if (isContainerFolder || activeFolder) return [];
    const generalFolderIds = new Set(
      folders
        .filter((f) => f.name.trim().toLowerCase() === 'general')
        .map((f) => f.id)
    );
    const unassigned = images.filter(
      (i) => !i.folderId || generalFolderIds.has(i.folderId)
    );
    const q = searchQuery.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter(
      (i) => i.originalName.toLowerCase().includes(q) || i.shortCode.toLowerCase().includes(q)
    );
  }, [images, folders, activeFolder, isContainerFolder, searchQuery]);

  const rootTables = useMemo(() => {
    if (isContainerFolder || activeFolder) return [];
    const unassigned = tables.filter((t) => !t.folderId);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter(
      (t) => t.tableName.toLowerCase().includes(q) || t.shortCode.toLowerCase().includes(q)
    );
  }, [tables, activeFolder, isContainerFolder, searchQuery]);

  const totalItemsInGrid = currentFolders.length + rootImages.length + rootTables.length;

  return (
    <div className={styles.container} data-testid="unified-explorer-view">
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>
            {activeFolder ? activeFolder.name : 'Explorador Principal'}
          </h1>
          <span className={styles.subtitle}>
            {isContainerFolder
              ? `Carpeta contenedora — Solo contiene subcarpetas (${currentFolders.length})`
              : `${currentFolders.length} carpeta(s) en este nivel`}
          </span>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar carpetas o archivos..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={styles.searchInput}
              aria-label="Buscar en el explorador"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className={styles.clearSearchBtn}
                aria-label="Limpiar búsqueda"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {totalItemsInGrid === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FolderOpen size={28} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {isContainerFolder ? 'Esta carpeta contenedora está vacía' : 'No hay elementos en este nivel'}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: 400 }}>
            {isContainerFolder
              ? 'Dentro de una carpeta contenedora solo pueden crearse subcarpetas especializadas (Imágenes, Tablas o PDF).'
              : 'Crea una carpeta para empezar a organizar tus imágenes, tablas o documentos PDF.'}
          </p>
          {onOpenNewFolder && (
            <Button
              variant="secondary"
              size="sm"
              icon={<FolderPlus size={14} />}
              onClick={onOpenNewFolder}
            >
              {activeFolder ? 'Crear Subcarpeta' : 'Crear Carpeta'}
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {currentFolders.map((folder) => (
            <FolderGridCard
              key={folder.id}
              folder={folder}
              onOpenFolder={(f) => onOpenFolder?.(f)}
              onEditFolder={onEditFolder}
              onShareFolder={onShareFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}

          {rootImages.map((img) => (
            <ImageCard
              key={img.id || img.shortCode}
              image={img}
              onOpenInspector={() => undefined}
              onDelete={onDeleteImage}
              onMoveToFolder={onMoveImageToFolder}
            />
          ))}

          {rootTables.map((tbl) => (
            <TableCard
              key={tbl.id || tbl.shortCode}
              table={tbl}
              onOpenStudio={onOpenStudio}
              onDelete={onDeleteTable}
              onMoveToFolder={onMoveTableToFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};
