import React, { useId, useRef, useState } from 'react';
import { RefreshCw, Upload, X } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { ShortCodeChip } from '../../components/ui/ShortCodeChip';
import { useToast } from '../../context/useToast';
import {
  useHotSwapPdfMutation,
  useHotSwapTableMutation,
  useReplaceImageMutation,
} from '../../queries/useMediaQueries';
import { getUploadConstraints } from '../explorer/explorerRules';
import { imagesService } from '../../services/imagesService';
import { pdfsService } from '../../services/pdfsService';
import { storageService } from '../../services/storageService';
import { buildPublicAssetUrl, formatBytes } from '../../utils/formatters';
import type { ImageItem, MediaCategory, PdfItem, TableItem } from '../../types/media';
import styles from './AssetMutationDialog.module.css';

/**
 * Resultado devuelto tras sustituir en caliente (Hot-Swap) un activo multimedia.
 */
export type ReplacedAssetResult = ImageItem | TableItem | PdfItem;

/**
 * Propiedades del diálogo reutilizable de reemplazo en caliente (`PUT` Hot-Swap).
 */
export interface HotSwapAssetDialogProps {
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
  /** Categoría del activo (`image`, `table` o `pdf`). */
  kind: MediaCategory;
  /** UUID del recurso a reemplazar. */
  assetId: string;
  /** Código corto que se preservará tras el reemplazo. */
  shortCode: string;
  /** Nombre actual del activo mostrado como referencia. */
  currentName: string;
  /** Callback opcional invocado con la entidad actualizada (incluyendo `urlWithVersion`). */
  onReplaced?: (updated: ReplacedAssetResult) => void;
}

const PREFIX_MAP: Record<MediaCategory, 'i' | 't' | 'p'> = {
  image: 'i',
  table: 't',
  pdf: 'p',
};

/**
 * Diálogo reutilizable de reemplazo binario en caliente (Hot-Swap) para Imágenes (`PUT /api/v1/images/:id`),
 * Tablas `.csv/.xlsx/.xls/.json` (`PUT /api/v1/tables/:id`) y PDFs (`PUT /api/v1/pdfs/:id`).
 * Preserva el `shortCode` público, invalida la caché de React Query y refresca `urlWithVersion`.
 */
export const HotSwapAssetDialog: React.FC<HotSwapAssetDialogProps> = ({
  open,
  onOpenChange,
  kind,
  assetId,
  shortCode,
  currentName,
  onReplaced,
}) => {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { showToast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const replaceImage = useReplaceImageMutation();
  const hotSwapTable = useHotSwapTableMutation();
  const hotSwapPdf = useHotSwapPdfMutation();

  const constraints = getUploadConstraints(kind);
  const isPending = replaceImage.isPending || hotSwapTable.isPending || hotSwapPdf.isPending;

  const canonicalUrl =
    kind === 'image'
      ? imagesService.getImageUrl(shortCode)
      : kind === 'pdf'
      ? pdfsService.getPdfUrl(shortCode)
      : buildPublicAssetUrl(storageService.getApiBaseUrl(), 't', shortCode);

  const validateAndPick = (file: File | undefined) => {
    if (!file) return;
    if (!constraints.validateFile(file)) {
      setErrorMsg(`Formato no compatible. Formatos permitidos: ${constraints.formatsLabel}.`);
      setSelectedFile(null);
      return;
    }
    if (file.size > constraints.maxBytes) {
      setErrorMsg(`El archivo supera el límite máximo de ${constraints.maxSizeLabel}.`);
      setSelectedFile(null);
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedFile(null);
      setErrorMsg(null);
      setIsDragOver(false);
    }
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!selectedFile) {
      setErrorMsg('Selecciona un archivo de reemplazo antes de continuar.');
      return;
    }

    setErrorMsg(null);
    try {
      let updated: ReplacedAssetResult;
      if (kind === 'image') {
        updated = await replaceImage.mutateAsync({ id: assetId, file: selectedFile });
      } else if (kind === 'table') {
        updated = await hotSwapTable.mutateAsync({ id: assetId, file: selectedFile });
      } else {
        updated = await hotSwapPdf.mutateAsync({ id: assetId, file: selectedFile });
      }

      showToast('Archivo reemplazado en caliente conservando el enlace público.', 'success');
      onReplaced?.(updated);
      handleClose(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo reemplazar el archivo.';
      setErrorMsg(detail || fallback);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title={`Reemplazar archivo (Hot-Swap)`}
      description={`Sustituye el contenido de "${currentName}" sin romper sus enlaces públicos ni su código corto.`}
      size="md"
      footer={
        <div className={styles.footerActions}>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            icon={<RefreshCw size={14} />}
            loading={isPending}
            disabled={!selectedFile}
            onClick={() => void handleConfirm()}
            data-testid="hotswap-confirm-btn"
          >
            Reemplazar archivo
          </Button>
        </div>
      }
    >
      <div className={styles.form}>
        <div className={styles.identityRow}>
          <span className={styles.identityHint}>Enlace preservado</span>
          <ShortCodeChip prefix={PREFIX_MAP[kind]} shortCode={shortCode} copyValue={canonicalUrl} />
        </div>

        <label
          htmlFor={inputId}
          className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            validateAndPick(e.dataTransfer.files?.[0]);
          }}
        >
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept={constraints.accept}
            className={styles.hiddenInput}
            data-testid="hotswap-file-input"
            onChange={(e) => validateAndPick(e.target.files?.[0])}
          />
          <Upload size={20} aria-hidden="true" />
          <span className={styles.dropTitle}>Haz clic o arrastra el nuevo archivo aquí</span>
          <span className={styles.dropHint}>
            Formatos aceptados: {constraints.formatsLabel} · Máximo {constraints.maxSizeLabel}
          </span>
        </label>

        {selectedFile ? (
          <div className={styles.selectedFile} data-testid="hotswap-selected-file">
            <div className={styles.fileMeta}>
              <span className={styles.fileName}>{selectedFile.name}</span>
              <span className={styles.fileSize}>{formatBytes(selectedFile.size)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Quitar archivo seleccionado"
              icon={<X size={14} />}
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
          </div>
        ) : null}

        {errorMsg ? (
          <div className={styles.errorBanner} role="alert">
            {errorMsg}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
};
