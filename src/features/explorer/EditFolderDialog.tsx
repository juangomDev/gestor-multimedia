import React, { useMemo, useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { useUpdateFolderMutation } from '../../queries/useFoldersQueries';
import { getFolderPathLabel } from '../../services/foldersService';
import {
  getValidMoveFolderParents,
  isGeneralFolder,
  isSystemFolder,
} from './explorerRules';
import type { FolderItem } from '../../types/media';
import styles from './ExplorerDialogs.module.css';

/**
 * Propiedades del diálogo de edición de carpeta (`EditFolderDialog`).
 */
export interface EditFolderDialogProps {
  folder: FolderItem | null;
  /** Lista plana completa de carpetas para ofrecer reubicación jerárquica segura (`parentId`). */
  allFolders?: FolderItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo para editar nombre, ubicación jerárquica (`parentId`) y privacidad de una carpeta
 * (`PATCH /api/v1/folders/:id`), protegiendo bóvedas de sistema (`shared`) y `General`.
 */
export const EditFolderDialog: React.FC<EditFolderDialogProps> = ({
  folder,
  allFolders = [],
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const updateMutation = useUpdateFolderMutation();

  const [name, setName] = useState(folder?.name ?? '');
  const [isPrivate, setIsPrivate] = useState(Boolean(folder?.isPrivate));
  const [parentId, setParentId] = useState<string>(folder?.parentId ?? '');
  const [error, setError] = useState<string | null>(null);
  const snapshotKey = `${open}:${folder?.id ?? ''}:${folder?.name ?? ''}:${Boolean(
    folder?.isPrivate
  )}:${folder?.parentId ?? ''}`;
  const [trackedKey, setTrackedKey] = useState(snapshotKey);

  if (snapshotKey !== trackedKey) {
    setTrackedKey(snapshotKey);
    if (folder) {
      setName(folder.name);
      setIsPrivate(Boolean(folder.isPrivate));
      setParentId(folder.parentId ?? '');
      setError(null);
    }
  }

  const systemLocked = isSystemFolder(folder);
  const generalLocked = isGeneralFolder(folder);

  const validParents = useMemo(() => {
    if (!folder || allFolders.length === 0) return [];
    return getValidMoveFolderParents(folder, allFolders, user?.role, user?.id);
  }, [folder, allFolders, user?.role, user?.id]);

  const canSelectRoot = Boolean(
    folder && (user?.role !== 'COLLABORATOR' || folder.parentId === null)
  );
  const showParentSelector = !systemLocked && !generalLocked && allFolders.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!folder || systemLocked) return;

    const cleanName = name.trim();
    if (!generalLocked && !cleanName) {
      setError('El nombre de la carpeta no puede estar vacío.');
      return;
    }

    const nextParentId = parentId.trim() ? parentId : null;
    const currentParentId = folder.parentId ?? null;
    const parentChanged = showParentSelector && nextParentId !== currentParentId;

    setError(null);
    try {
      await updateMutation.mutateAsync({
        id: folder.id,
        payload: {
          ...(generalLocked ? {} : { name: cleanName }),
          isPrivate,
          ...(parentChanged ? { parentId: nextParentId } : {}),
        },
      });
      showToast(parentChanged ? 'Carpeta actualizada y reubicada' : 'Carpeta actualizada', 'success');
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      setError(detail || message || 'No se pudo actualizar la carpeta.');
    }
  };

  return (
    <Dialog
      open={open && Boolean(folder)}
      onOpenChange={onOpenChange}
      title={folder ? `Editar "${folder.name}"` : 'Editar carpeta'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {systemLocked ? (
          <div role="alert" className={`${styles.notice} ${styles.noticeWarn}`}>
            <AlertTriangle size={16} aria-hidden="true" />
            <span>Las carpetas reservadas del sistema no se pueden modificar.</span>
          </div>
        ) : null}

        {generalLocked ? (
          <div className={`${styles.notice} ${styles.noticeInfo}`}>
            <span>
              La carpeta protegida &ldquo;General&rdquo; conserva su nombre fijo; solo puedes
              ajustar su privacidad.
            </span>
          </div>
        ) : null}

        <Input
          label="Nombre de la carpeta"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          error={error}
          disabled={systemLocked || generalLocked || updateMutation.isPending}
          autoFocus={!generalLocked}
        />

        {showParentSelector ? (
          <div className={styles.field}>
            <label htmlFor="edit-folder-parent" className={styles.label}>
              Ubicación (carpeta padre)
            </label>
            <select
              id="edit-folder-parent"
              className={styles.select}
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={updateMutation.isPending}
              data-testid="edit-folder-parent-select"
            >
              {canSelectRoot ? <option value="">Raíz (Nivel 1)</option> : null}
              {validParents.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {getFolderPathLabel(candidate, allFolders)}
                </option>
              ))}
            </select>
            <span className={styles.fieldHint}>
              Solo se muestran destinos compatibles dentro del límite de 3 niveles.
            </span>
          </div>
        ) : null}

        <div className={styles.switchRow}>
          <label htmlFor="edit-folder-private" className={styles.switchText}>
            <span className={styles.switchTitle}>Carpeta privada</span>
            <span className={styles.switchSub}>
              Restringe visibilidad a propietarios, invitados y ADMIN.
            </span>
          </label>
          <Switch
            id="edit-folder-private"
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
            disabled={systemLocked || updateMutation.isPending}
            ariaLabel="Alternar privacidad de la carpeta"
          />
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Save size={15} />}
            disabled={systemLocked}
            loading={updateMutation.isPending}
          >
            Guardar cambios
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
