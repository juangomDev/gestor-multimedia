import React from 'react';
import { AlertCircle, ArrowLeft, FolderOpen, Info, RotateCcw, Upload } from 'lucide-react';
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
 * Propiedades del estado vacío o de error contextual del Explorador (`ExplorerEmptyState`).
 */
export interface ExplorerEmptyStateProps {
  isInsideFolder: boolean;
  isFolderNotFound?: boolean;
  isError?: boolean;
  searchQuery: string;
  uploadGuard: UploadButtonState;
  createFolderGuard: CreateFolderGuardResult;
  onOpenUpload: () => void;
  onOpenCreateFolder: () => void;
  onRetry?: () => void;
  onReturnHome?: () => void;
}

/**
 * Estado vacío, carpeta inexistente o fallo de red para el Explorador.
 */
export const ExplorerEmptyState: React.FC<ExplorerEmptyStateProps> = ({
  isInsideFolder,
  isFolderNotFound = false,
  isError = false,
  searchQuery,
  uploadGuard,
  createFolderGuard,
  onOpenUpload,
  onOpenCreateFolder,
  onRetry,
  onReturnHome,
}) => {
  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle size={22} />}
        title="No se pudo cargar el contenido"
        description="Ocurrió un error al consultar las carpetas o archivos en el servidor."
        action={
          onRetry ? (
            <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={onRetry}>
              Reintentar
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (isFolderNotFound) {
    return (
      <EmptyState
        icon={<FolderOpen size={22} />}
        title="Carpeta no encontrada o sin acceso"
        description="La carpeta solicitada no existe, fue eliminada o no tienes permiso para verla."
        action={
          onReturnHome ? (
            <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={onReturnHome}>
              Volver al explorador
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
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
};
