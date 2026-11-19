import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/useToast';
import { useDeleteFolderMutation } from '../../queries/useFoldersQueries';
import { isGeneralFolder, isSystemFolder } from './explorerRules';
import type { FolderItem } from '../../types/media';
import styles from './ExplorerDialogs.module.css';

/**
 * Propiedades del diálogo de confirmación de borrado en cascada (`DeleteFolderDialog`).
 */
export interface DeleteFolderDialogProps {
  folder: FolderItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (folderId: string) => void;
}

/**
 * Diálogo de confirmación para eliminar una carpeta en cascada (`DELETE /api/v1/folders/:id`),
 * bloqueando bóvedas del sistema (`shared`) y la carpeta protegida `General`.
 */
export const DeleteFolderDialog: React.FC<DeleteFolderDialogProps> = ({
  folder,
  open,
  onOpenChange,
  onDeleted,
}) => {
  const { showToast } = useToast();
  const deleteMutation = useDeleteFolderMutation();
  const [lastFolder, setLastFolder] = React.useState<FolderItem | null>(folder);
  if (folder && folder !== lastFolder) {
    setLastFolder(folder);
  }
  const displayFolder = folder ?? lastFolder;

  const isProtected = isSystemFolder(displayFolder) || isGeneralFolder(displayFolder);

  const handleConfirm = async () => {
    if (!folder || isProtected) return;
    try {
      await deleteMutation.mutateAsync(folder.id);
      showToast(`Carpeta "${folder.name}" eliminada`, 'info');
      onDeleted?.(folder.id);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      showToast(detail || message || 'No se pudo eliminar la carpeta.', 'error');
    }
  };

  return (
    <Dialog
      open={open && Boolean(folder)}
      onOpenChange={onOpenChange}
      title={displayFolder ? `Eliminar "${displayFolder.name}"` : 'Eliminar carpeta'}
      size="sm"
      footer={
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            icon={<Trash2 size={15} />}
            disabled={isProtected}
            loading={deleteMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            Eliminar en cascada
          </Button>
        </div>
      }
    >
      <div className={styles.form}>
        {isProtected ? (
          <div role="alert" className={`${styles.notice} ${styles.noticeWarn}`}>
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              Esta carpeta está protegida por el sistema y no puede eliminarse.
            </span>
          </div>
        ) : (
          <div role="alert" className={`${styles.notice} ${styles.noticeDanger}`}>
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              Advertencia de borrado en cascada: se eliminarán permanentemente la carpeta{' '}
              <strong>{displayFolder?.name}</strong>, sus subcarpetas y todos los archivos físicos
              contenidos ({displayFolder?.itemCount ?? 0} ítems).
            </span>
          </div>
        )}
      </div>
    </Dialog>
  );
};
