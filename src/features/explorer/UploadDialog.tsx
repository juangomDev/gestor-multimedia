import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Trash2, Upload } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/useToast';
import {
  useUploadImageMutation,
  useUploadPdfMutation,
  useUploadTableMutation,
} from '../../queries/useMediaQueries';
import { formatBytes } from '../../utils/formatters';
import { getUploadConstraints } from './explorerRules';
import type { FolderItem, MediaCategory } from '../../types/media';
import styles from './UploadDialog.module.css';

type QueueStatus = 'pending' | 'uploading' | 'done' | 'error';

interface QueuedFile {
  id: string;
  file: File;
  status: QueueStatus;
  progress: number;
  error?: string;
}

/**
 * Propiedades del diálogo contextual de subida estricta (`UploadDialog`).
 */
export interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderItem;
  initialFiles?: File[];
}

function buildQueueEntries(files: File[], type: MediaCategory): QueuedFile[] {
  const rules = getUploadConstraints(type);
  return files.map((file, idx) => {
    const id = `${file.name}-${file.size}-${idx}-${Date.now()}`;
    if (!rules.validateFile(file)) {
      return {
        id,
        file,
        status: 'error',
        progress: 1,
        error: `Formato no compatible con esta carpeta (permitido: ${rules.formatsLabel}).`,
      };
    }
    if (file.size > rules.maxBytes) {
      return {
        id,
        file,
        status: 'error',
        progress: 1,
        error: `Supera el límite máximo permitido de ${rules.maxSizeLabel}.`,
      };
    }
    return { id, file, status: 'pending', progress: 0 };
  });
}

/**
 * Diálogo de subida contextual activo únicamente en carpetas tipadas con permiso `EDIT`/`ADMIN`.
 * Restringe extensiones (`IMAGE`, `TABLE` incluyendo `.json`, `PDF`), valida límites (50 MB / 100 MB)
 * antes de subir y muestra progreso real por archivo.
 */
export const UploadDialog: React.FC<UploadDialogProps> = ({
  open,
  onOpenChange,
  folder,
  initialFiles,
}) => {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadImage = useUploadImageMutation();
  const uploadTable = useUploadTableMutation();
  const uploadPdf = useUploadPdfMutation();

  const mediaType: MediaCategory =
    folder.type === 'table' ? 'table' : folder.type === 'pdf' ? 'pdf' : 'image';
  const constraints = getUploadConstraints(mediaType);

  const [queue, setQueue] = useState<QueuedFile[]>(() =>
    initialFiles?.length ? buildQueueEntries(initialFiles, mediaType) : []
  );
  const [isUploading, setIsUploading] = useState(false);
  const [trackedOpen, setTrackedOpen] = useState(open);

  if (trackedOpen !== open) {
    setTrackedOpen(open);
    setQueue(open && initialFiles?.length ? buildQueueEntries(initialFiles, mediaType) : []);
  }

  const appendFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;
    setQueue((prev) => [...prev, ...buildQueueEntries(incoming, mediaType)]);
  };

  const removeEntry = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const pendingCount = queue.filter((item) => item.status === 'pending').length;

  const handleUploadAll = async () => {
    const pendingItems = queue.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0 || isUploading) return;

    setIsUploading(true);
    let successCount = 0;

    for (const entry of pendingItems) {
      setQueue((prev) =>
        prev.map((q) => (q.id === entry.id ? { ...q, status: 'uploading', progress: 0.45 } : q))
      );

      try {
        if (mediaType === 'image') {
          await uploadImage.mutateAsync({ file: entry.file, folderId: folder.id });
        } else if (mediaType === 'table') {
          await uploadTable.mutateAsync({ file: entry.file, folderId: folder.id });
        } else {
          await uploadPdf.mutateAsync({ file: entry.file, folderId: folder.id });
        }

        successCount += 1;
        setQueue((prev) =>
          prev.map((q) => (q.id === entry.id ? { ...q, status: 'done', progress: 1 } : q))
        );
      } catch (err: unknown) {
        const detail = (err as { detail?: string })?.detail;
        const message = err instanceof Error ? err.message : undefined;
        setQueue((prev) =>
          prev.map((q) =>
            q.id === entry.id
              ? {
                  ...q,
                  status: 'error',
                  progress: 1,
                  error: detail || message || 'Error al subir archivo',
                }
              : q
          )
        );
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      showToast(
        `${successCount} archivo${successCount === 1 ? '' : 's'} subido${
          successCount === 1 ? '' : 's'
        } a "${folder.name}"`,
        'success'
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isUploading) {
          if (!next) setQueue([]);
          onOpenChange(next);
        }
      }}
      title={`Subir ${constraints.artifactLabel} a "${folder.name}"`}
      description={`Formatos admitidos: ${constraints.formatsLabel} · Máximo ${constraints.maxSizeLabel} por archivo.`}
      size="md"
      footer={
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cerrar
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={<Upload size={15} />}
            disabled={pendingCount === 0}
            loading={isUploading}
            onClick={() => void handleUploadAll()}
          >
            Subir {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Button>
        </div>
      }
    >
      <div className={styles.stack}>
        <button
          type="button"
          className={styles.dropBox}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isUploading && e.dataTransfer?.files?.length) {
              appendFiles(e.dataTransfer.files);
            }
          }}
          disabled={isUploading}
        >
          <Upload size={20} aria-hidden="true" />
          <span className={styles.dropTitle}>Seleccionar archivos de tu equipo</span>
          <span className={styles.dropHint}>
            {constraints.formatsLabel} · hasta {constraints.maxSizeLabel}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={constraints.accept}
          className={styles.hiddenInput}
          aria-label="Seleccionar archivos para subir"
          onChange={(e) => {
            if (e.target.files) appendFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {queue.length > 0 ? (
          <div className={styles.queue} aria-label="Cola de subida">
            {queue.map((entry) => (
              <div key={entry.id} className={styles.fileRow}>
                <div className={styles.fileTop}>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{entry.file.name}</span>
                    <span className={styles.fileMeta}>{formatBytes(entry.file.size)}</span>
                  </div>

                  {entry.status === 'done' ? (
                    <Badge tone="ok">
                      <CheckCircle2 size={12} aria-hidden="true" /> Listo
                    </Badge>
                  ) : entry.status === 'error' ? (
                    <div className={styles.actions}>
                      <Badge tone="danger">
                        <AlertCircle size={12} aria-hidden="true" /> Rechazado
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={<Trash2 size={14} />}
                        aria-label={`Quitar ${entry.file.name}`}
                        onClick={() => removeEntry(entry.id)}
                        disabled={isUploading}
                      />
                    </div>
                  ) : entry.status === 'uploading' ? (
                    <Badge tone="accent">Subiendo...</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      icon={<Trash2 size={14} />}
                      aria-label={`Quitar ${entry.file.name}`}
                      onClick={() => removeEntry(entry.id)}
                      disabled={isUploading}
                    />
                  )}
                </div>

                {entry.error ? <span className={styles.fileError}>{entry.error}</span> : null}

                <div className={styles.progressTrack} aria-hidden="true">
                  <div
                    className={`${styles.progressBar} ${
                      entry.status === 'done'
                        ? styles.progressDone
                        : entry.status === 'error'
                        ? styles.progressError
                        : ''
                    }`}
                    style={{ transform: `scaleX(${entry.progress})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
};
