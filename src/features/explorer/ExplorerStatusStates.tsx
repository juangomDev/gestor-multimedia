import React from 'react';
import { FolderOpen, Info, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import type { FolderItem } from '../../types/media';
import type { UploadButtonState } from '../shell/uploadContextRules';
import type { CreateFolderGuardResult } from './explorerRules';
import styles from './ExplorerPage.module.css';

/**
 * Propiedades del banner informativo para carpetas contenedoras (`ExplorerContainerBanner`).
 */
export interface ExplorerContainerBannerProps {
  folder: FolderItem;
}

/**
 * Banner sobrio mostrado al explorar carpetas de tipo `CONTAINER` o la bóveda `shared`.
 */
export const ExplorerContainerBanner: React.FC<ExplorerContainerBannerProps> = ({ folder }) => (
  <div className={styles.containerBanner} role="note">
    <Info size={16} className={styles.bannerIcon} aria-hidden="true" />
    <span>
      {folder.isSystem
        ? 'Bóveda compartida del sistema (solo lectura): explora las carpetas compartidas contigo.'
        : 'Carpeta contenedora: organiza subcarpetas de Imágenes, Tablas o PDFs aquí. Las subidas de archivos se realizan dentro de subcarpetas tipadas.'}
    </span>
  </div>
);

/**
 * Propiedades del estado vacío contextual del Explorador (`ExplorerEmptyState`).
 */
export interface ExplorerEmptyStateProps {
  isInsideFolder: boolean;
  searchQuery: string;
  uploadGuard: UploadButtonState;
  createFolderGuard: CreateFolderGuardResult;
  onOpenUpload: () => void;
  onOpenCreateFolder: () => void;
}

/**
 * Estado vacío contextual para el Explorador (búsqueda sin resultados, raíz vacía o carpeta vacía).
 */
export const ExplorerEmptyState: React.FC<ExplorerEmptyStateProps> = ({
  isInsideFolder,
  searchQuery,
  uploadGuard,
  createFolderGuard,
  onOpenUpload,
  onOpenCreateFolder,
}) => (
  <EmptyState
    icon={<FolderOpen size={22} />}
    title={
      searchQuery
        ? 'Sin resultados para tu filtro'
        : isInsideFolder
        ? 'Esta carpeta está vacía'
        : 'Aún no hay carpetas raíz'
    }
    description={
      searchQuery
        ? `No se encontraron elementos que coincidan con "${searchQuery}".`
        : uploadGuard.enabled
        ? `Arrastra archivos o pulsa "${uploadGuard.label}" para empezar.`
        : 'Crea una carpeta para organizar tus imágenes, tablas o documentos PDF.'
    }
    action={
      uploadGuard.enabled ? (
        <Button variant="primary" size="sm" icon={<Upload size={14} />} onClick={onOpenUpload}>
          {uploadGuard.label}
        </Button>
      ) : createFolderGuard.allowed ? (
        <Button variant="primary" size="sm" onClick={onOpenCreateFolder}>
          Crear primera carpeta
        </Button>
      ) : undefined
    }
  />
);
