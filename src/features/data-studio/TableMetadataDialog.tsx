import React, { useId, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../context/useToast';
import { useUpdateTableMetadataMutation } from '../../queries/useMediaQueries';
import type { MetadataCard } from '../../types/api';
import styles from './TableMetadataDialog.module.css';

/**
 * Propiedades del editor completo de Ficha Técnica de un dataset tabular (`TableMetadataDialog`).
 */
export interface TableMetadataDialogProps {
  /** Controla la apertura del diálogo. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
  /** UUID del dataset (`PATCH /api/v1/tables/:id/metadata`). */
  tableId: string;
  /** Nombre legible de la tabla mostrado en cabecera. */
  tableName: string;
  /** Columnas detectadas en el dataset para poblar `columnsMeta`. */
  columns: string[];
  /** Ficha técnica actual (si existe). */
  initialMetadata?: MetadataCard | Record<string, unknown> | null;
  /** Callback opcional con la ficha técnica guardada. */
  onSaved?: (saved: MetadataCard) => void;
}

function normalizeMetadata(raw: TableMetadataDialogProps['initialMetadata']): MetadataCard {
  if (!raw || typeof raw !== 'object') {
    return { title: '', description: '', tags: [], unit: '', columnsMeta: {}, hasSummaryRows: false };
  }
  const card = raw as MetadataCard;
  return {
    title: typeof card.title === 'string' ? card.title : '',
    description: typeof card.description === 'string' ? card.description : '',
    tags: Array.isArray(card.tags) ? card.tags.map(String) : [],
    unit: typeof card.unit === 'string' ? card.unit : '',
    columnsMeta: card.columnsMeta && typeof card.columnsMeta === 'object' ? { ...card.columnsMeta } : {},
    hasSummaryRows: Boolean(card.hasSummaryRows),
  };
}

/**
 * Editor completo de Ficha Técnica (`metadataCard`) para datasets tabulares
 * (`title`, `description`, `tags`, `unit`, `columnsMeta` y `hasSummaryRows`)
 * conectado a `PATCH /api/v1/tables/:id/metadata`.
 */
export const TableMetadataDialog: React.FC<TableMetadataDialogProps> = ({
  open,
  onOpenChange,
  tableId,
  tableName,
  columns,
  initialMetadata,
  onSaved,
}) => {
  const formId = useId();
  const descId = useId();
  const summarySwitchId = useId();
  const { showToast } = useToast();
  const updateMetadata = useUpdateTableMetadataMutation();

  const initial = normalizeMetadata(initialMetadata);
  const [trackedKey, setTrackedKey] = useState(`${tableId}:${JSON.stringify(initial)}`);
  const [title, setTitle] = useState(initial.title || '');
  const [unit, setUnit] = useState(initial.unit || '');
  const [description, setDescription] = useState(initial.description || '');
  const [tags, setTags] = useState<string[]>(initial.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [columnsMeta, setColumnsMeta] = useState<Record<string, string>>(initial.columnsMeta || {});
  const [hasSummaryRows, setHasSummaryRows] = useState(Boolean(initial.hasSummaryRows));

  const currentKey = `${tableId}:${JSON.stringify(initial)}`;
  if (currentKey !== trackedKey) {
    setTrackedKey(currentKey);
    setTitle(initial.title || '');
    setUnit(initial.unit || '');
    setDescription(initial.description || '');
    setTags(initial.tags || []);
    setTagInput('');
    setColumnsMeta(initial.columnsMeta || {});
    setHasSummaryRows(Boolean(initial.hasSummaryRows));
  }

  const detectedColumns = Array.from(new Set([...columns, ...Object.keys(columnsMeta)]));

  const handleAddTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    if (!tags.includes(clean)) setTags((prev) => [...prev, clean]);
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedCols: Record<string, string> = {};
    for (const [key, val] of Object.entries(columnsMeta)) {
      if (val.trim()) cleanedCols[key] = val.trim();
    }

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedUnit = unit.trim();

    const payload: MetadataCard = {
      title: trimmedTitle || (initial.title ? '' : undefined),
      description: trimmedDesc || (initial.description ? '' : undefined),
      tags,
      unit: trimmedUnit || (initial.unit ? '' : undefined),
      columnsMeta: cleanedCols,
      hasSummaryRows,
    };

    try {
      await updateMetadata.mutateAsync({ id: tableId, metadata: payload });
      showToast(`Ficha Técnica de "${tableName}" actualizada.`, 'success');
      onSaved?.(payload);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudo guardar la Ficha Técnica.', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Ficha técnica · ${tableName}`}
      description="Enriquece el contexto semántico del dataset para búsquedas y consultas del asistente IA."
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
            data-testid="table-metadata-save-btn"
          >
            Guardar ficha técnica
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.twoCol}>
          <Input
            label="Título descriptivo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Censo Nacional de Población 2026"
          />
          <Input
            label="Unidad de medida"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Ej. USD, habitantes, kg"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={descId} className={styles.label}>
            Descripción y alcance
          </label>
          <textarea
            id={descId}
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe origen de los datos, periodicidad o notas de interpretación..."
          />
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.label}>Etiquetas temáticas</span>
          <div className={styles.tagInputRow}>
            <div className={styles.tagInputGrow}>
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
                aria-label="Nueva etiqueta temática"
              />
            </div>
            <Button type="button" variant="secondary" size="sm" icon={<Plus size={14} />} onClick={handleAddTag}>
              Añadir
            </Button>
          </div>

          {tags.length > 0 ? (
            <div className={styles.tagsWrap}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tagChip}>
                  {tag}
                  <button
                    type="button"
                    className={styles.tagRemoveBtn}
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

        <div className={styles.switchRow}>
          <div className={styles.switchCopy}>
            <label htmlFor={summarySwitchId} className={styles.switchTitle}>
              Incluye filas de totales o subtotales
            </label>
            <span className={styles.switchDesc}>
              Evita doble conteo automático al analizar sumatorias en el asistente de datos.
            </span>
          </div>
          <Switch
            id={summarySwitchId}
            checked={hasSummaryRows}
            onCheckedChange={setHasSummaryRows}
          />
        </div>

        {detectedColumns.length > 0 ? (
          <div className={styles.fieldGroup}>
            <span className={styles.label}>Glosario de columnas ({detectedColumns.length})</span>
            <div className={styles.columnsList}>
              {detectedColumns.map((col) => (
                <div key={col} className={styles.columnRow}>
                  <span className={styles.columnKey} title={col}>
                    {col}
                  </span>
                  <input
                    type="text"
                    className={styles.columnInput}
                    value={columnsMeta[col] || ''}
                    onChange={(e) =>
                      setColumnsMeta((prev) => ({ ...prev, [col]: e.target.value }))
                    }
                    placeholder={`Significado de ${col}...`}
                    aria-label={`Descripción de columna ${col}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </form>
    </Dialog>
  );
};
