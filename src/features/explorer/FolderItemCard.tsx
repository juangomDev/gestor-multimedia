import React from 'react';
import { Link } from 'react-router';
import {
  Folder,
  Lock,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/DropdownMenu';
import { isGeneralFolder, isSystemFolder } from './explorerRules';
import type { FolderCategory, FolderItem } from '../../types/media';
import styles from './FolderItemCard.module.css';

/**
 * Propiedades de la tarjeta de carpeta con lomo izquierdo de 3px (`FolderItemCard`).
 */
export interface FolderItemCardProps {
  folder: FolderItem;
  canEdit: boolean;
  canShare: boolean;
  onShare: (folder: FolderItem) => void;
  onEdit: (folder: FolderItem) => void;
  onDelete: (folder: FolderItem) => void;
}

const SPINE_CLASS: Record<FolderCategory, string> = {
  container: styles.spineContainer,
  image: styles.spineImage,
  table: styles.spineTable,
  pdf: styles.spinePdf,
};

const TYPE_LABEL: Record<FolderCategory, string> = {
  container: 'Contenedor',
  image: 'Imágenes',
  table: 'Tablas',
  pdf: 'PDFs',
};

/**
 * Tarjeta editorial de carpeta con lomo tipado de 3px, marca `SISTEMA` en `shared`,
 * indicadores discretos de privacidad/compartición y menú contextual Radix `⋯`.
 */
export const FolderItemCard: React.FC<FolderItemCardProps> = ({
  folder,
  canEdit,
  canShare,
  onShare,
  onEdit,
  onDelete,
}) => {
  const systemLocked = isSystemFolder(folder);
  const generalLocked = isGeneralFolder(folder);
  const showMenu = !systemLocked && (canEdit || canShare);
  const count = folder.itemCount ?? 0;

  return (
    <article
      className={`${styles.card} ${SPINE_CLASS[folder.type]}`}
      data-testid={`folder-card-${folder.id}`}
    >
      <div className={styles.topRow}>
        <Link to={`/folder/${folder.id}`} className={styles.mainLink}>
          <Folder size={16} className={styles.folderIcon} aria-hidden="true" />
          <span className={styles.name} title={folder.name}>
            {folder.name}
          </span>
        </Link>

        {showMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={styles.menuBtn}
                aria-label={`Acciones de la carpeta ${folder.name}`}
              >
                <MoreHorizontal size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canShare ? (
                <DropdownMenuItem icon={<Share2 size={14} />} onSelect={() => onShare(folder)}>
                  Compartir
                </DropdownMenuItem>
              ) : null}
              {canEdit ? (
                <DropdownMenuItem icon={<Pencil size={14} />} onSelect={() => onEdit(folder)}>
                  Editar
                </DropdownMenuItem>
              ) : null}
              {canEdit && !generalLocked ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    tone="danger"
                    icon={<Trash2 size={14} />}
                    onSelect={() => onDelete(folder)}
                  >
                    Eliminar
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className={styles.metaRow}>
        <span className={styles.badges}>
          {systemLocked ? (
            <Badge tone="accent" mono>
              SISTEMA
            </Badge>
          ) : (
            <Badge artifactDot={folder.type}>{TYPE_LABEL[folder.type]}</Badge>
          )}
          {folder.isPrivate ? (
            <span className={styles.flagIcon} title="Carpeta privada" aria-label="Carpeta privada">
              <Lock size={12} />
            </span>
          ) : null}
          {folder.isShared ? (
            <span className={styles.flagIcon} title="Compartida" aria-label="Compartida">
              <Users size={12} />
            </span>
          ) : null}
        </span>

        <span className={styles.count}>
          {count} {count === 1 ? 'ítem' : 'ítems'}
        </span>
      </div>
    </article>
  );
};
