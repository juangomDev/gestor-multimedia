import React, { useId, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/useToast';
import { useUpdateImageMetadataMutation } from '../../queries/useMediaQueries';
import type { ImageItem, ImageMetadataCard } from '../../types/media';
import styles from '../pdfs/PdfMetadataDialog.module.css';

/**
 * Propiedades del editor de ficha técnica semántica de una imagen (`ImageMetadataDialog`).
 */
export interface ImageMetadataDialogProps {
  /** Controla la apertura del diálogo. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
  /** UUID de la imagen (`PATCH /api/v1/images/:id/metadata`). */
  imageId: string;
  /** Nombre visible de la imagen. */
  imageName: string;
  /** Ficha técnica actual de la imagen. */
  initialMetadata?: ImageMetadataCard | null;
  /** Callback invocado tras guardar exitosamente. */
  onSaved?: (updated: ImageItem) => void;
}

interface CustomPair {
  key: string;
  value: string;
}

function toCustomPairs(custom?: Record<string, string>): CustomPair[] {
  if (!custom || typeof custom !== 'object') return [];
  return Object.entries(custom).map(([key, value]) => ({ key, value: String(value ?? '') }));
}

/**
 * Editor de ficha técnica para imágenes (`title`, `alt`, `description`, `tags` y `custom`)
 * alineado con `PATCH /api/v1/images/:id/metadata`.
 */
export const ImageMetadataDialog: React.FC<ImageMetadataDialogProps> = ({
  open,
  onOpenChange,
  imageId,
  imageName,
  initialMetadata,
  onSaved,
}) => {
  const formId = useId();
  const descriptionId = useId();
  const { showToast } = useToast();
  const updateMetadata = useUpdateImageMetadataMutation();

  const snapshotKey = `${imageId}:${JSON.stringify(initialMetadata ?? null)}`;
  const [trackedKey, setTrackedKey] = useState(snapshotKey);
  const [title, setTitle] = useState(initialMetadata?.title || '');
  const [alt, setAlt] = useState(initialMetadata?.alt || '');
  const [description, setDescription] = useState(initialMetadata?.description || '');
  const [tags, setTags] = useState<string[]>(initialMetadata?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [customPairs, setCustomPairs] = useState<CustomPair[]>(() =>
    toCustomPairs(initialMetadata?.custom)
  );

  if (snapshotKey !== trackedKey) {
    setTrackedKey(snapshotKey);
    setTitle(initialMetadata?.title || '');
    setAlt(initialMetadata?.alt || '');
    setDescription(initialMetadata?.description || '');
    setTags(initialMetadata?.tags || []);
    setTagInput('');
    setCustomPairs(toCustomPairs(initialMetadata?.custom));
  }

  const handleAddTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    if (!tags.includes(clean)) setTags((prev) => [...prev, clean]);
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customRecord: Record<string, string> = {};
    for (const pair of customPairs) {
      const k = pair.key.trim();
      const v = pair.value.trim();
      if (k && v) customRecord[k] = v;
    }

    const payload: ImageMetadataCard = {
      title: title.trim() || (initialMetadata?.title ? '' : undefined),
      alt: alt.trim() || (initialMetadata?.alt ? '' : undefined),
      description: description.trim() || (initialMetadata?.description ? '' : undefined),
      tags,
      custom: customRecord,
    };

    try {
      const updated = await updateMetadata.mutateAsync({ id: imageId, metadata: payload });
      showToast(`Metadatos de "${imageName}" actualizados.`, 'success');
      onSaved?.(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudieron guardar los metadatos de la imagen.', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Ficha de imagen · ${imageName}`}
      description="Define título, texto alternativo accesible (alt), etiquetas y atributos personalizados."
      size="lg"
      footer={
        <div className={styles.footerActions}>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={updateMetadata.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            icon={<Check size={14} />}
            loading={updateMetadata.isPending}
            data-testid="image-metadata-save-btn"
          >
            Guardar metadatos
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Portada campaña institucional 2026"
        />

        <Input
          label="Texto alternativo (alt)"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Descripción concisa para accesibilidad y SEO..."
        />

        <div className={styles.fieldGroup}>
          <label htmlFor={descriptionId} className={styles.label}>
            Descripción
          </label>
          <textarea
            id={descriptionId}
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexto editorial, derechos de uso o notas de publicación..."
          />
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.label}>Etiquetas</span>
          <div className={styles.addRow}>
            <div className={styles.grow}>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Añadir etiqueta y pulsar Enter..."
                aria-label="Nueva etiqueta de imagen"
              />
            </div>
            <Button type="button" variant="secondary" size="sm" icon={<Plus size={14} />} onClick={handleAddTag}>
              Añadir
            </Button>
          </div>
          {tags.length > 0 ? (
            <div className={styles.chipsWrap}>
              {tags.map((tag) => (
                <span key={tag} className={styles.chip}>
                  {tag}
                  <button
                    type="button"
                    className={styles.chipRemove}
                    aria-label={`Quitar etiqueta ${tag}`}
                    onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.addRow}>
            <span className={styles.label}>Atributos personalizados</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => setCustomPairs((prev) => [...prev, { key: '', value: '' }])}
            >
              Añadir campo
            </Button>
          </div>
          {customPairs.map((pair, idx) => (
            <div key={`custom-${idx}`} className={styles.customRow}>
              <input
                type="text"
                className={styles.customInput}
                placeholder="Clave (ej. autor)"
                aria-label="Clave personalizada"
                value={pair.key}
                onChange={(e) =>
                  setCustomPairs((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, key: e.target.value } : item))
                  )
                }
              />
              <input
                type="text"
                className={styles.customInput}
                placeholder="Valor"
                aria-label="Valor personalizado"
                value={pair.value}
                onChange={(e) =>
                  setCustomPairs((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item))
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                icon={<X size={13} />}
                aria-label="Eliminar campo personalizado"
                onClick={() => setCustomPairs((prev) => prev.filter((_, i) => i !== idx))}
              />
            </div>
          ))}
        </div>
      </form>
    </Dialog>
  );
};
