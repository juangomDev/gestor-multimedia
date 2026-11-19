import React, { useId, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/useToast';
import { useUpdatePdfMetadataMutation } from '../../queries/useMediaQueries';
import type { PdfItem, PdfMetadataCard } from '../../types/media';
import styles from './PdfMetadataDialog.module.css';

interface CustomPair {
  id: string;
  key: string;
  value: string;
}

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

function toCustomPairs(custom: Record<string, unknown> | undefined): CustomPair[] {
  if (!custom || typeof custom !== 'object') return [];
  return Object.entries(custom).map(([key, val], idx) => ({
    id: `kv-${idx}-${key}`,
    key,
    value: val === null || val === undefined ? '' : String(val),
  }));
}

/**
 * Editor de ficha técnica documental para PDFs (`category`, `summary`, `keywords` y campos
 * personalizados `custom`) conectado a `PATCH /api/v1/pdfs/:id/metadata`.
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
  const summaryId = useId();
  const { showToast } = useToast();
  const updateMetadata = useUpdatePdfMetadataMutation();

  const snapshotKey = `${pdfId}:${JSON.stringify(initialMetadata ?? null)}`;
  const [trackedKey, setTrackedKey] = useState(snapshotKey);
  const [category, setCategory] = useState(initialMetadata?.category || '');
  const [summary, setSummary] = useState(initialMetadata?.summary || '');
  const [keywords, setKeywords] = useState<string[]>(initialMetadata?.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [customPairs, setCustomPairs] = useState<CustomPair[]>(() =>
    toCustomPairs(initialMetadata?.custom)
  );

  if (snapshotKey !== trackedKey) {
    setTrackedKey(snapshotKey);
    setCategory(initialMetadata?.category || '');
    setSummary(initialMetadata?.summary || '');
    setKeywords(initialMetadata?.keywords || []);
    setKeywordInput('');
    setCustomPairs(toCustomPairs(initialMetadata?.custom));
  }

  const handleAddKeyword = () => {
    const clean = keywordInput.trim();
    if (!clean) return;
    if (!keywords.includes(clean)) setKeywords((prev) => [...prev, clean]);
    setKeywordInput('');
  };

  const handleAddCustomRow = () => {
    setCustomPairs((prev) => [...prev, { id: `kv-${Date.now()}-${prev.length}`, key: '', value: '' }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const customObj: Record<string, unknown> = {};
    for (const pair of customPairs) {
      const k = pair.key.trim();
      if (k) customObj[k] = pair.value.trim();
    }

    const payload: PdfMetadataCard = {
      category: category.trim() || undefined,
      summary: summary.trim() || undefined,
      keywords,
      custom: Object.keys(customObj).length > 0 ? customObj : undefined,
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
          label="Categoría documental"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Ej. Contrato, Normativa, Manual Técnico, Informe"
        />

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
          <span className={styles.label}>Palabras clave (`keywords`)</span>
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

        <div className={styles.fieldGroup}>
          <div className={styles.customHeader}>
            <span className={styles.label}>Campos personalizados (`custom`)</span>
            <Button type="button" variant="ghost" size="sm" icon={<Plus size={13} />} onClick={handleAddCustomRow}>
              Añadir campo
            </Button>
          </div>
          <div className={styles.customList}>
            {customPairs.length === 0 ? (
              <p className={styles.emptyCustom}>Sin campos personalizados. Añade claves como autor, versión o departamento.</p>
            ) : (
              customPairs.map((pair) => (
                <div key={pair.id} className={styles.customRow}>
                  <input
                    type="text"
                    className={styles.customInput}
                    value={pair.key}
                    onChange={(e) =>
                      setCustomPairs((prev) =>
                        prev.map((p) => (p.id === pair.id ? { ...p, key: e.target.value } : p))
                      )
                    }
                    placeholder="Clave (ej. departamento)"
                    aria-label="Clave personalizada"
                  />
                  <input
                    type="text"
                    className={styles.customInput}
                    value={pair.value}
                    onChange={(e) =>
                      setCustomPairs((prev) =>
                        prev.map((p) => (p.id === pair.id ? { ...p, value: e.target.value } : p))
                      )
                    }
                    placeholder="Valor (ej. Legal)"
                    aria-label="Valor personalizado"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={13} />}
                    aria-label="Eliminar campo personalizado"
                    onClick={() => setCustomPairs((prev) => prev.filter((p) => p.id !== pair.id))}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
};
