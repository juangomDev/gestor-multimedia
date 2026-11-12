import React, { useState, useMemo } from 'react';
import { Search, FolderPlus, FolderOpen, X } from 'lucide-react';
import { FolderGridCard } from '../components/folders/FolderGridCard';
import { ImageCard } from '../components/images/ImageCard';
import { TableCard } from '../components/tables/TableCard';
import { PdfCard } from '../components/pdfs/PdfCard';
import { Button } from '../components/common/Button';
import { ImageInspector } from '../components/images/ImageInspector';
import { PdfViewerModal } from '../components/pdfs/PdfViewerModal';
import type { ImageItem, TableItem, FolderItem, PdfItem } from '../types/media';
import type { WorkspaceView } from '../components/layout/Sidebar';
import styles from './ImagesView.module.css';

/**
 * Propiedades de la vista de Explorador Principal unificado por carpetas.
 */
export interface UnifiedExplorerViewProps {
  folders?: FolderItem[];
  activeFolder?: FolderItem | null;
  images: ImageItem[];
  tables: TableItem[];
  pdfs?: PdfItem[];
  pdfsCount?: number;
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
  onDeletePdf?: (pdf: PdfItem) => void;
  onOpenStudio: (tbl: TableItem) => void;
  onMoveImageToFolder?: (img: ImageItem) => void;
  onMoveTableToFolder?: (tbl: TableItem) => void;
  onMovePdfToFolder?: (pdf: PdfItem) => void;
  onViewChange: (view: WorkspaceView) => void;
}

/**
 * Vista de Explorador Principal donde las carpetas y el contenido de cualquier tipo
 * (Imágenes, Tablas, Documentos PDF) comparten la misma cuadrícula de forma cohesiva.
 */
export const UnifiedExplorerView: React.FC<UnifiedExplorerViewProps> = ({
  folders = [],
  activeFolder = null,
  images,
  tables,
  pdfs = [],
  searchQuery,
  onSearchChange,
  onOpenNewFolder,
  onOpenFolder,
  onEditFolder,
  onShareFolder,
  onDeleteFolder,
  onDeleteImage,
  onDeleteTable,
  onDeletePdf,
  onOpenStudio,
  onMoveImageToFolder,
  onMoveTableToFolder,
  onMovePdfToFolder,
}) => {
  const [inspectingImage, setInspectingImage] = useState<ImageItem | null>(null);
  const [viewingPdf, setViewingPdf] = useState<PdfItem | null>(null);

  const isContainerFolder = activeFolder?.type === 'container';

  const currentFolders = useMemo(() => {
    const parentId = activeFolder ? activeFolder.id : null;
    const byParent = folders.filter((f) => (f.parentId ?? null) === parentId);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byParent;
    return byParent.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, activeFolder, searchQuery]);

  const currentImages = useMemo(() => {
    if (isContainerFolder || (activeFolder && activeFolder.type !== 'image')) return [];
    const q = searchQuery.trim().toLowerCase();
    let list: ImageItem[];
    if (activeFolder) {
      list = images.filter((i) => i.folderId === activeFolder.id);
    } else {
      const generalFolderIds = new Set(
        folders.filter((f) => f.name.trim().toLowerCase() === 'general').map((f) => f.id)
      );
      list = images.filter((i) => !i.folderId || generalFolderIds.has(i.folderId));
    }
    if (!q) return list;
    return list.filter((i) => i.originalName.toLowerCase().includes(q) || i.shortCode.toLowerCase().includes(q));
  }, [images, folders, activeFolder, isContainerFolder, searchQuery]);

  const currentTables = useMemo(() => {
    if (isContainerFolder || (activeFolder && activeFolder.type !== 'table')) return [];
    const q = searchQuery.trim().toLowerCase();
    let list: TableItem[];
    if (activeFolder) {
      list = tables.filter((t) => t.folderId === activeFolder.id);
    } else {
      list = tables.filter((t) => !t.folderId);
    }
    if (!q) return list;
    return list.filter((t) => t.tableName.toLowerCase().includes(q) || t.shortCode.toLowerCase().includes(q));
  }, [tables, activeFolder, isContainerFolder, searchQuery]);

  const currentPdfs = useMemo(() => {
    if (isContainerFolder || (activeFolder && activeFolder.type !== 'pdf')) return [];
    const q = searchQuery.trim().toLowerCase();
    let list: PdfItem[];
    if (activeFolder) {
      list = pdfs.filter((p) => p.folderId === activeFolder.id);
    } else {
      list = pdfs.filter((p) => !p.folderId);
    }
    if (!q) return list;
    return list.filter((p) => p.originalName.toLowerCase().includes(q) || p.shortCode.toLowerCase().includes(q));
  }, [pdfs, activeFolder, isContainerFolder, searchQuery]);

  const totalFiles = currentImages.length + currentTables.length + currentPdfs.length;
  const totalItemsInGrid = currentFolders.length + totalFiles;

  const subtitleText = isContainerFolder
    ? `Carpeta contenedora — Solo contiene subcarpetas (${currentFolders.length})`
    : activeFolder
    ? `${currentFolders.length > 0 ? `${currentFolders.length} subcarpeta(s) · ` : ''}${totalFiles} archivo(s)`
    : `${currentFolders.length} carpeta(s) en la raíz`;

  return (
    <div className={styles.container} data-testid="unified-explorer-view">
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>
            {activeFolder ? activeFolder.name : 'Explorador Principal'}
          </h1>
          <span className={styles.subtitle}>{subtitleText}</span>
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

      {isContainerFolder && (
        <div
          data-testid="container-folder-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: 'var(--text-secondary)',
            fontSize: '0.78rem',
          }}
        >
          <span>
            <strong>Carpeta Departamental / Raíz (Nivel 1):</strong> Solo aloja subcarpetas. Entra o crea una subcarpeta especializada (Imágenes, Tablas o PDF) para subir archivos.
          </span>
        </div>
      )}

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
              : 'Crea una carpeta o sube archivos para empezar a organizar tu espacio.'}
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

          {currentImages.map((img) => (
            <ImageCard
              key={img.id || img.shortCode}
              image={img}
              onOpenInspector={setInspectingImage}
              onDelete={onDeleteImage}
              onMoveToFolder={onMoveImageToFolder}
            />
          ))}

          {currentTables.map((tbl) => (
            <TableCard
              key={tbl.id || tbl.shortCode}
              table={tbl}
              onOpenStudio={onOpenStudio}
              onDelete={onDeleteTable}
              onMoveToFolder={onMoveTableToFolder}
            />
          ))}

          {currentPdfs.map((pdf) => (
            <PdfCard
              key={pdf.id || pdf.shortCode}
              pdf={pdf}
              onOpenViewer={setViewingPdf}
              onDelete={onDeletePdf}
              onMoveToFolder={onMovePdfToFolder}
            />
          ))}
        </div>
      )}

      {inspectingImage && (
        <ImageInspector
          image={inspectingImage}
          isOpen={!!inspectingImage}
          onClose={() => setInspectingImage(null)}
          onDelete={(img) => {
            onDeleteImage(img);
            setInspectingImage(null);
          }}
        />
      )}

      {viewingPdf && (
        <PdfViewerModal
          pdf={viewingPdf}
          isOpen={!!viewingPdf}
          onClose={() => setViewingPdf(null)}
        />
      )}
    </div>
  );
};
