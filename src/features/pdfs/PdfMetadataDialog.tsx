import React, { useId, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/useToast';
import { useUpdatePdfMetadataMutation } from '../../queries/useMediaQueries';
import type { PdfItem, PdfMetadataCard } from '../../types/media';
import styles from './PdfMetadataDialog.module.css';

/**
 * Propiedades del editor de metadatos semánticos de un documento PDF (`PdfMetadataDialog`).
 */
export interface PdfMetadataDialogProps {
  /** Controla la apertura del diálogo. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
  /** UUID del documento PDF (`PATCH /api/v1/pdfs/:id/metadata`). */
  pdfId: string;
  /** Nombre visible del documento. */
  pdfName: string;
  /** Ficha de metadatos actual del PDF. */
  initialMetadata?: PdfMetadataCard | null;
  /** Callback invocado con la entidad actualizada tras guardar. */
  onSaved?: (updated: PdfItem) => void;
}

/**
 * Editor de ficha técnica documental para PDFs (`title`, `description`, `summary`, `tags`
 * y `keywords`) alineado al contrato OpenAPI de `PATCH /api/v1/pdfs/:id/metadata`.
 */
export const PdfMetadataDialog: React.FC<PdfMetadataDialogProps> = ({
  open,
  onOpenChange,
  pdfId,
  pdfName,
  initialMetadata,
  onSaved,
}) => {
  const formId = useId();
  const descriptionId = useId();
  const summaryId = useId();
  const { showToast } = useToast();
  const updateMetadata = useUpdatePdfMetadataMutation();

  const snapshotKey = `${pdfId}:${JSON.stringify(initialMetadata ?? null)}`;
  const [trackedKey, setTrackedKey] = useState(snapshotKey);
  const [title, setTitle] = useState(initialMetadata?.title || '');
  const [description, setDescription] = useState(initialMetadata?.description || '');
  const [summary, setSummary] = useState(initialMetadata?.summary || '');
  const [tags, setTags] = useState<string[]>(initialMetadata?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>(initialMetadata?.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');

  if (snapshotKey !== trackedKey) {
    setTrackedKey(snapshotKey);
    setTitle(initialMetadata?.title || '');
    setDescription(initialMetadata?.description || '');
    setSummary(initialMetadata?.summary || '');
    setTags(initialMetadata?.tags || []);
    setTagInput('');
    setKeywords(initialMetadata?.keywords || []);
    setKeywordInput('');
  }

  const handleAddTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    if (!tags.includes(clean)) setTags((prev) => [...prev, clean]);
    setTagInput('');
  };

  const handleAddKeyword = () => {
    const clean = keywordInput.trim();
    if (!clean) return;
    if (!keywords.includes(clean)) setKeywords((prev) => [...prev, clean]);
    setKeywordInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedSummary = summary.trim();

    const payload: PdfMetadataCard = {
      title: trimmedTitle || (initialMetadata?.title ? '' : undefined),
      description: trimmedDesc || (initialMetadata?.description ? '' : undefined),
      summary: trimmedSummary || (initialMetadata?.summary ? '' : undefined),
      tags,
      keywords,
    };

    try {
      const updated = await updateMetadata.mutateAsync({ id: pdfId, metadata: payload });
      showToast(`Metadatos de "${pdfName}" actualizados.`, 'success');
      onSaved?.(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudieron guardar los metadatos del PDF.', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Ficha documental · ${pdfName}`}
      description="Clasifica y resume el PDF para mejorar la recuperación semántica y citas RAG."
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
            data-testid="pdf-metadata-save-btn"
          >
            Guardar metadatos
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <Input
          label="Título documental"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Contrato Marco de Servicios 2026"
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
            placeholder="Describe el origen, área responsable o propósito del documento..."
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={summaryId} className={styles.label}>
            Resumen ejecutivo
          </label>
          <textarea
            id={summaryId}
            className={styles.textarea}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Sintetiza el alcance, vigencia o temas clave del documento..."
          />
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.label}>Etiquetas temáticas</span>
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
                aria-label="Nueva etiqueta"
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
          <span className={styles.label}>Palabras clave</span>
          <div className={styles.addRow}>
            <div className={styles.grow}>
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                placeholder="Añadir palabra clave y pulsar Enter..."
                aria-label="Nueva palabra clave"
              />
            </div>
            <Button type="button" variant="secondary" size="sm" icon={<Plus size={14} />} onClick={handleAddKeyword}>
              Añadir
            </Button>
          </div>

          {keywords.length > 0 ? (
            <div className={styles.chipsWrap}>
              {keywords.map((kw) => (
                <span key={kw} className={styles.chip}>
                  {kw}
                  <button
                    type="button"
                    className={styles.chipRemove}
                    aria-label={`Quitar palabra clave ${kw}`}
                    onClick={() => setKeywords((prev) => prev.filter((item) => item !== kw))}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
};
