import React, { useContext, useState } from 'react';
import { ExternalLink, Maximize2, ZoomIn } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/useToast';
import { ShellContext } from '../shell/shellContextDef';
import { useDeleteImageMutation, useMoveImageMutation } from '../../queries/useMediaQueries';
import { imagesService } from '../../services/imagesService';
import { MoveResourceDialog } from '../explorer/MoveResourceDialog';
import { RenameAssetDialog } from './RenameAssetDialog';
import { HotSwapAssetDialog } from './HotSwapAssetDialog';
import { ImageMetadataDialog } from './ImageMetadataDialog';
import { ImageInspectorSidebar } from './ImageInspectorSidebar';
import type { ImageItem } from '../../types/media';
import styles from './ImageInspectorDialog.module.css';

type ZoomMode = 'fit' | '100' | '150';

/**
 * Propiedades del visor/inspector de imágenes cargado con `React.lazy`.
 */
export interface ImageInspectorDialogProps {
  /** Controla si el inspector está abierto. */
  open: boolean;
  /** Callback al cerrar el inspector. */
  onOpenChange: (open: boolean) => void;
  /** Código corto de la imagen a inspeccionar (`/i/:shortCode`). */
  shortCode: string;
  /** Título opcional (por defecto usa `image.originalName` o `shortCode`). */
  title?: string;
  /** URL versionada opcional (`urlWithVersion`) para saltar caché tras Hot-Swap. */
  urlWithVersion?: string;
  /** Registro completo opcional cuando se abre desde el Explorador (habilita metadatos y mutaciones). */
  image?: ImageItem;
  /** Indica si el usuario tiene permisos de escritura (`EDIT`/`ADMIN`) sobre la imagen. */
  canEdit?: boolean;
}

/**
 * Inspector de imágenes editorial con carga diferida (`React.lazy`), variante original
 * (`/i/:shortCode?variant=original&v=...`), controles de zoom/ajuste, panel lateral de metadatos
 * y acciones integradas de Renombrar (`PATCH`), Hot-Swap (`PUT`), Mover y Eliminar.
 */
export const ImageInspectorDialog: React.FC<ImageInspectorDialogProps> = ({
  open,
  onOpenChange,
  shortCode,
  title,
  urlWithVersion,
  image,
  canEdit = false,
}) => {
  const { showToast } = useToast();
  const shell = useContext(ShellContext);
  const deleteImage = useDeleteImageMutation();
  const moveImage = useMoveImageMutation();

  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit');
  const [loadFailed, setLoadFailed] = useState(false);
  const [measuredDims, setMeasuredDims] = useState<{ w: number; h: number } | null>(null);
  const identityKey = `${open}:${shortCode}:${image?.id ?? ''}:${image?.urlWithVersion ?? ''}`;
  const [localImage, setLocalImage] = useState<ImageItem | undefined>(image);
  const [trackedCode, setTrackedCode] = useState(identityKey);

  const [renameOpen, setRenameOpen] = useState(false);
  const [hotSwapOpen, setHotSwapOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  if (identityKey !== trackedCode) {
    setTrackedCode(identityKey);
    setLocalImage(image);
    setZoomMode('fit');
    setLoadFailed(false);
    setMeasuredDims(null);
    setMetadataOpen(false);
  }

  const activeCode = localImage?.shortCode || shortCode;
  const activeTitle = localImage?.originalName || title || `Imagen · ${activeCode}`;
  const activeVersionUrl = localImage?.urlWithVersion || urlWithVersion;
  const canonicalUrl = imagesService.getImageUrl(activeCode);
  const downloadUrl = imagesService.getImageDownloadUrl(activeCode);
  const displayUrl = imagesService.getImageVariantUrl(
    { shortCode: activeCode, urlWithVersion: activeVersionUrl, updatedAt: localImage?.updatedAt },
    'original'
  );

  const width = localImage?.width ?? measuredDims?.w ?? null;
  const height = localImage?.height ?? measuredDims?.h ?? null;
  const canMutate = Boolean(localImage?.id && canEdit);

  const handleDelete = async () => {
    if (!localImage?.id) return;
    try {
      await deleteImage.mutateAsync(localImage.id);
      showToast('Imagen eliminada correctamente.', 'info');
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudo eliminar la imagen.', 'error');
    }
  };

  const imgClass =
    zoomMode === '150'
      ? styles.imageZoomLarge
      : zoomMode === '100'
      ? styles.imageActual
      : styles.imageFit;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setZoomMode('fit');
            setLoadFailed(false);
          }
          onOpenChange(next);
        }}
        title={activeTitle}
        description="Variante original servida directamente desde monolith-backend."
        size="xl"
      >
        <div className={styles.layout} data-testid="image-inspector-dialog">
          <div className={styles.stageColumn}>
            <div className={styles.stage}>
              {loadFailed ? (
                <div className={styles.errorBox}>
                  No se pudo cargar la imagen para el código <code>i/{activeCode}</code>. Verifica
                  que el recurso exista y sea accesible.
                </div>
              ) : (
                <img
                  key={displayUrl}
                  src={displayUrl}
                  alt={activeTitle}
                  className={imgClass}
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    if (el.naturalWidth && el.naturalHeight) {
                      setMeasuredDims({ w: el.naturalWidth, h: el.naturalHeight });
                    }
                  }}
                  onError={() => setLoadFailed(true)}
                />
              )}
            </div>

            <div className={styles.stageToolbar}>
              <div className={styles.zoomGroup} role="group" aria-label="Controles de zoom">
                <button
                  type="button"
                  className={`${styles.zoomBtn} ${zoomMode === 'fit' ? styles.zoomBtnActive : ''}`}
                  onClick={() => setZoomMode('fit')}
                  disabled={loadFailed}
                >
                  <Maximize2 size={12} aria-hidden="true" />
                  Ajustar
                </button>
                <button
                  type="button"
                  className={`${styles.zoomBtn} ${zoomMode === '100' ? styles.zoomBtnActive : ''}`}
                  onClick={() => setZoomMode('100')}
                  disabled={loadFailed}
                >
                  100%
                </button>
                <button
                  type="button"
                  className={`${styles.zoomBtn} ${zoomMode === '150' ? styles.zoomBtnActive : ''}`}
                  onClick={() => setZoomMode('150')}
                  disabled={loadFailed}
                >
                  <ZoomIn size={12} aria-hidden="true" />
                  150%
                </button>
              </div>

              <a href={canonicalUrl} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm" icon={<ExternalLink size={14} />}>
                  Abrir pestaña
                </Button>
              </a>
            </div>
          </div>

          <ImageInspectorSidebar
            shortCode={activeCode}
            canonicalUrl={canonicalUrl}
            downloadUrl={downloadUrl}
            image={localImage}
            width={width}
            height={height}
            canMutate={canMutate}
            canMove={Boolean(shell && shell.allFolders.length > 0)}
            isDeleting={deleteImage.isPending}
            onOpenRename={() => setRenameOpen(true)}
            onOpenHotSwap={() => setHotSwapOpen(true)}
            onOpenMetadata={() => setMetadataOpen(true)}
            onOpenMove={() => setMoveOpen(true)}
            onConfirmDelete={handleDelete}
          />
        </div>
      </Dialog>

      {localImage && metadataOpen ? (
        <ImageMetadataDialog
          open={metadataOpen}
          onOpenChange={setMetadataOpen}
          imageId={localImage.id}
          imageName={localImage.originalName}
          initialMetadata={localImage.metadataCard}
          onSaved={(updated) => setLocalImage({ ...localImage, ...updated })}
        />
      ) : null}

      {localImage && renameOpen ? (
        <RenameAssetDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          kind="image"
          assetId={localImage.id}
          shortCode={localImage.shortCode}
          currentName={localImage.originalName}
          onRenamed={(updated) => setLocalImage({ ...localImage, ...(updated as ImageItem) })}
        />
      ) : null}

      {localImage && hotSwapOpen ? (
        <HotSwapAssetDialog
          open={hotSwapOpen}
          onOpenChange={setHotSwapOpen}
          kind="image"
          assetId={localImage.id}
          shortCode={localImage.shortCode}
          currentName={localImage.originalName}
          onReplaced={(updated) => {
            setLoadFailed(false);
            setLocalImage({ ...localImage, ...(updated as ImageItem) });
          }}
        />
      ) : null}

      {localImage && moveOpen && shell ? (
        <MoveResourceDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          resourceKind="image"
          resourceLabel={localImage.originalName}
          currentFolderId={localImage.folderId ?? null}
          allFolders={shell.allFolders}
          loading={moveImage.isPending}
          onConfirmMove={async (targetFolderId) => {
            await moveImage.mutateAsync({ imageId: localImage.id, folderId: targetFolderId });
            setLocalImage({ ...localImage, folderId: targetFolderId });
            showToast('Imagen movida correctamente.', 'success');
          }}
        />
      ) : null}
    </>
  );
};

export default ImageInspectorDialog;
