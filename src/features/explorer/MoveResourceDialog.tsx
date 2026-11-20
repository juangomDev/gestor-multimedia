import React, { useState } from 'react';
import { Folder, FolderInput } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { getFolderPathLabel } from '../../services/foldersService';
import { canWriteFolder } from './explorerRules';
import type { FolderItem, MediaCategory } from '../../types/media';
import styles from './ExplorerDialogs.module.css';

/**
 * Propiedades del selector jerárquico de carpeta destino (`MoveResourceDialog`).
 */
export interface MoveResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceKind: MediaCategory;
  resourceLabel: string;
  currentFolderId: string | null;
  allFolders: FolderItem[];
  loading?: boolean;
  onConfirmMove: (targetFolderId: string) => Promise<void> | void;
}

/**
 * Selector jerárquico basado en `GET /api/v1/folders/tree` que filtra exclusivamente
 * carpetas compatibles con el tipo del recurso (`image`, `table` o `pdf`) y permiso `EDIT`/`ADMIN`.
 */
export const MoveResourceDialog: React.FC<MoveResourceDialogProps> = ({
  open,
  onOpenChange,
  resourceKind,
  resourceLabel,
  currentFolderId,
  allFolders,
  loading = false,
  onConfirmMove,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [trackedContext, setTrackedContext] = useState(
    `${open}:${resourceKind}:${currentFolderId ?? 'root'}`
  );

  const currentContext = `${open}:${resourceKind}:${currentFolderId ?? 'root'}`;
  if (currentContext !== trackedContext) {
    setTrackedContext(currentContext);
    setSelectedFolderId('');
  }

  const compatibleFolders = allFolders.filter(
    (f) =>
      f.type === resourceKind &&
      f.id !== currentFolderId &&
      canWriteFolder(f, user?.role, user?.id)
  );

  const effectiveSelected =
    selectedFolderId && compatibleFolders.some((f) => f.id === selectedFolderId)
      ? selectedFolderId
      : compatibleFolders[0]?.id ?? '';

  const handleConfirm = async () => {
    if (!effectiveSelected) return;
    try {
      await onConfirmMove(effectiveSelected);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      showToast(detail || message || 'No se pudo mover el recurso a la carpeta seleccionada.', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelectedFolderId('');
        onOpenChange(next);
      }}
      title={`Mover ${resourceLabel}`}
      description="Solo se muestran carpetas compatibles con el tipo de archivo y con permiso de edición."
      size="sm"
      footer={
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={<FolderInput size={15} />}
            disabled={!effectiveSelected}
            loading={loading}
            onClick={() => void handleConfirm()}
          >
            Mover aquí
          </Button>
        </div>
      }
    >
      {compatibleFolders.length === 0 ? (
        <div className={`${styles.notice} ${styles.noticeInfo}`}>
          <span>
            No hay otras carpetas de tipo <strong>{resourceKind.toUpperCase()}</strong> con
            permiso de edición disponibles como destino.
          </span>
        </div>
      ) : (
        <div className={styles.folderList} role="radiogroup" aria-label="Carpeta destino">
          {compatibleFolders.map((folder) => {
            const selected = effectiveSelected === folder.id;
            const path = getFolderPathLabel(folder, allFolders);
            return (
              <button
                key={folder.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`${styles.folderOption} ${
                  selected ? styles.folderOptionSelected : ''
                }`}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <span className={styles.folderOptionLabel}>
                  <Folder size={14} aria-hidden="true" />
                  <span>{path}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Dialog>
  );
};
