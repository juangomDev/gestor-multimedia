import React, { useId, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ShortCodeChip } from '../../components/ui/ShortCodeChip';
import { useToast } from '../../context/useToast';
import {
  useRenameImageMutation,
  useRenamePdfMutation,
  useRenameTableMutation,
} from '../../queries/useMediaQueries';
import { imagesService } from '../../services/imagesService';
import { pdfsService } from '../../services/pdfsService';
import { storageService } from '../../services/storageService';
import { buildPublicAssetUrl } from '../../utils/formatters';
import type { ImageItem, MediaCategory, PdfItem, TableItem } from '../../types/media';
import styles from './AssetMutationDialog.module.css';

/**
 * Resultado devuelto tras renombrar un activo multimedia en `monolith-backend`.
 */
export type RenamedAssetResult = ImageItem | TableItem | PdfItem;

/**
 * Propiedades del diálogo reutilizable para renombrar Imágenes, Tablas y PDFs (`PATCH`).
 */
export interface RenameAssetDialogProps {
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback al cerrar el diálogo. */
  onOpenChange: (open: boolean) => void;
  /** Categoría del recurso (`image`, `table` o `pdf`). */
  kind: MediaCategory;
  /** Identificador UUID del recurso en el servidor. */
  assetId: string;
  /** Código corto público preservado tras el renombrado. */
  shortCode: string;
  /** Nombre actual del activo. */
  currentName: string;
  /** Callback opcional con el recurso actualizado tras guardar. */
  onRenamed?: (updated: RenamedAssetResult) => void;
}

const KIND_LABELS: Record<MediaCategory, { title: string; field: string; prefix: 'i' | 't' | 'p' }> = {
  image: { title: 'Renombrar imagen', field: 'Nombre de la imagen', prefix: 'i' },
  table: { title: 'Renombrar tabla', field: 'Nombre del dataset', prefix: 't' },
  pdf: { title: 'Renombrar documento PDF', field: 'Nombre del documento', prefix: 'p' },
};

/**
 * Diálogo reutilizable para renombrar Imágenes (`PATCH /api/v1/images/:id`),
 * Tablas (`PATCH /api/v1/tables/:id`) o PDFs (`PATCH /api/v1/pdfs/:id`) conservando su `shortCode`.
 */
export const RenameAssetDialog: React.FC<RenameAssetDialogProps> = ({
  open,
  onOpenChange,
  kind,
  assetId,
  shortCode,
  currentName,
  onRenamed,
}) => {
  const formId = useId();
  const { showToast } = useToast();
  const [name, setName] = useState(currentName);
  const [trackedId, setTrackedId] = useState(`${assetId}:${currentName}`);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const renameImage = useRenameImageMutation();
  const renameTable = useRenameTableMutation();
  const renamePdf = useRenamePdfMutation();

  const identityKey = `${assetId}:${currentName}`;
  if (identityKey !== trackedId) {
    setTrackedId(identityKey);
    setName(currentName);
    setErrorMsg(null);
  }

  const isPending = renameImage.isPending || renameTable.isPending || renamePdf.isPending;
  const meta = KIND_LABELS[kind];
  const canonicalUrl =
    kind === 'image'
      ? imagesService.getImageUrl(shortCode)
      : kind === 'pdf'
      ? pdfsService.getPdfUrl(shortCode)
      : buildPublicAssetUrl(storageService.getApiBaseUrl(), 't', shortCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Introduce un nombre válido.');
      return;
    }

    setErrorMsg(null);
    try {
      let updated: RenamedAssetResult;
      if (kind === 'image') {
        updated = await renameImage.mutateAsync({ id: assetId, originalName: trimmed });
      } else if (kind === 'table') {
        updated = await renameTable.mutateAsync({ id: assetId, tableName: trimmed });
      } else {
        updated = await renamePdf.mutateAsync({ id: assetId, originalName: trimmed });
      }

      showToast('Nombre actualizado correctamente.', 'success');
      onRenamed?.(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo renombrar el recurso.';
      setErrorMsg(detail || fallback);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={meta.title}
      description="El enlace corto público y los permisos se mantienen intactos."
      size="sm"
      footer={
        <div className={styles.footerActions}>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            icon={<Pencil size={14} />}
            loading={isPending}
          >
            Guardar nombre
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.identityRow}>
          <span className={styles.identityHint}>Identificador inmutable</span>
          <ShortCodeChip prefix={meta.prefix} shortCode={shortCode} copyValue={canonicalUrl} />
        </div>

        <Input
          label={meta.field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Escribe el nuevo nombre..."
          autoFocus
          required
          error={errorMsg}
        />
      </form>
    </Dialog>
  );
};
