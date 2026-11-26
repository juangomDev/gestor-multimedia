import React from 'react';
import { ClipboardCheck, ExternalLink, MoreHorizontal, Settings2, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/DropdownMenu';
import type { FormDefinition } from '../../types/forms';
import styles from './AssetItemCard.module.css';

/**
 * Propiedades de la tarjeta editorial de formulario dinámico (`FormAssetCard`).
 */
export interface FormAssetCardProps {
  /** Definición resumida del formulario. */
  form: FormDefinition;
  /** Habilita acciones de configuración y eliminación (`EDIT`/`ADMIN`). */
  canEdit: boolean;
  onOpen: () => void;
  onEditForm?: () => void;
  onDelete?: () => void;
}

/**
 * Tarjeta editorial dedicada a Formularios Dinámicos dentro de carpetas `TABLE`,
 * con contador de entradas (`_count.entries`) y menú contextual Radix `⋯` para
 * abrir la bandeja, configurar (`PATCH /api/v1/forms/:id`) o eliminar en cascada (`DELETE`).
 */
export const FormAssetCard: React.FC<FormAssetCardProps> = ({
  form,
  canEdit,
  onOpen,
  onEditForm,
  onDelete,
}) => {
  const entriesTotal = form._count?.entries ?? form.entriesCount ?? 0;

  return (
    <article className={`${styles.card} ${styles.spineForm}`} data-testid={`form-card-${form.id}`}>
      <div className={styles.headerRow}>
        <button type="button" className={styles.titleBtn} onClick={onOpen}>
          <ClipboardCheck size={15} aria-hidden="true" />
          <span className={styles.titleText} title={form.title}>
            {form.title}
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label={`Acciones de ${form.title}`}
            >
              <MoreHorizontal size={15} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem icon={<ExternalLink size={14} />} onSelect={onOpen}>
              Abrir bandeja
            </DropdownMenuItem>
            {canEdit && onEditForm ? (
              <DropdownMenuItem icon={<Settings2 size={14} />} onSelect={onEditForm}>
                Configurar formulario
              </DropdownMenuItem>
            ) : null}
            {canEdit && onDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="danger" icon={<Trash2 size={14} />} onSelect={onDelete}>
                  Eliminar formulario
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={styles.badgesRow}>
        <Badge artifactDot="form" mono>
          FORM
        </Badge>
      </div>

      <div className={styles.footerRow}>
        <span className={styles.metaText}>/{form.slug}</span>
        <span className={styles.metaText}>
          {entriesTotal} {entriesTotal === 1 ? 'entrada' : 'entradas'}
        </span>
      </div>
    </article>
  );
};
