import React, { useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Table2,
} from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { useCreateFolderMutation } from '../../queries/useFoldersQueries';
import {
  canCreateChildFolder,
  getAllowedChildFolderTypes,
} from './explorerRules';
import type { FolderCategory, FolderItem } from '../../types/media';
import styles from './ExplorerDialogs.module.css';

/**
 * Propiedades del diálogo de creación de carpetas en 3 niveles (`CreateFolderDialog`).
 */
export interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolder: FolderItem | null;
  allFolders: FolderItem[];
  onCreated?: (folder: FolderItem) => void;
}

const FOLDER_TYPE_OPTIONS: Array<{
  id: FolderCategory;
  label: string;
  spineClass: string;
  icon: React.ReactNode;
}> = [
  { id: 'container', label: 'Contenedor', spineClass: styles.spineContainer, icon: <Folder size={15} /> },
  { id: 'image', label: 'Imágenes', spineClass: styles.spineImage, icon: <ImageIcon size={15} /> },
  { id: 'table', label: 'Tablas', spineClass: styles.spineTable, icon: <Table2 size={15} /> },
  { id: 'pdf', label: 'PDFs', spineClass: styles.spinePdf, icon: <FileText size={15} /> },
];

/**
 * Diálogo de creación de carpetas implementando las reglas de `folders.hierarchy.service.ts`:
 * 4 tipos en raíz/`CONTAINER`, herencia bloqueada dentro de carpetas tipadas y bloqueo en Nivel 3.
 */
export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  open,
  onOpenChange,
  parentFolder,
  allFolders,
  onCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const createMutation = useCreateFolderMutation();

  const allowedTypes = getAllowedChildFolderTypes(parentFolder);
  const isTypeLocked = allowedTypes.length === 1;
  const guard = canCreateChildFolder(parentFolder, allFolders, user?.role, user?.id);

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<FolderCategory>(allowedTypes[0]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveType = isTypeLocked ? allowedTypes[0] : selectedType;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setName('');
      setSelectedType(allowedTypes[0]);
      setIsPrivate(false);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!guard.allowed) return;

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Escribe un nombre para la carpeta.');
      return;
    }

    setError(null);
    try {
      const created = await createMutation.mutateAsync({
        name: cleanName,
        type: effectiveType,
        ...(parentFolder ? { parentId: parentFolder.id } : {}),
        isPrivate,
      });
      showToast(`Carpeta "${created.name}" creada`, 'success');
      onCreated?.(created);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      setError(detail || message || 'No se pudo crear la carpeta.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={parentFolder ? `Nueva subcarpeta en "${parentFolder.name}"` : 'Nueva carpeta'}
      description="Organiza archivos hasta en 3 niveles jerárquicos."
      size="sm"
    >
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {!guard.allowed && guard.reason ? (
          <div role="alert" className={`${styles.notice} ${styles.noticeWarn}`}>
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{guard.reason}</span>
          </div>
        ) : null}

        <Input
          label="Nombre de la carpeta"
          placeholder="ej. Campañas 2026, Reportes Q4..."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          error={error}
          disabled={!guard.allowed || createMutation.isPending}
          autoFocus
        />

        <div className={styles.field}>
          <span className={styles.label}>
            Tipo de carpeta {isTypeLocked ? '(heredado del padre)' : ''}
          </span>
          <div className={styles.typeGrid} role="radiogroup" aria-label="Tipo de carpeta">
            {FOLDER_TYPE_OPTIONS.map((opt) => {
              const allowed = allowedTypes.includes(opt.id);
              const active = effectiveType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!allowed || !guard.allowed || createMutation.isPending}
                  onClick={() => setSelectedType(opt.id)}
                  className={`${styles.typeCard} ${opt.spineClass} ${
                    active ? styles.typeCardActive : ''
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.switchRow}>
          <label htmlFor="create-folder-private" className={styles.switchText}>
            <span className={styles.switchTitle}>Carpeta privada</span>
            <span className={styles.switchSub}>
              Solo visible para ti, colaboradores invitados y ADMIN.
            </span>
          </label>
          <Switch
            id="create-folder-private"
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
            disabled={!guard.allowed || createMutation.isPending}
            ariaLabel="Marcar carpeta como privada"
          />
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<FolderPlus size={15} />}
            disabled={!guard.allowed}
            loading={createMutation.isPending}
          >
            Crear carpeta
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
