import React, { useState } from 'react';
import { FileText, Plus, X, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { tablesService } from '../../services/tablesService';
import { useToast } from '../../context/useToast';
import type { TableItem } from '../../types/media';
import type { MetadataCard } from '../../types/api';

/**
 * Propiedades del modal de edición e inspección de la Ficha Técnica (`metadataCard`) de un dataset.
 */
export interface TableMetadataEditorModalProps {
  table: TableItem | null;
  isOpen: boolean;
  onClose: () => void;
  onMetadataSaved?: (updated: TableItem) => void;
}

/**
 * Extrae de forma tipada la ficha técnica existente de una tabla.
 */
function parseInitialMetadata(raw: TableItem['metadataCard']): MetadataCard {
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
 * Modal editor e inspector de Ficha Técnica (`PATCH /api/v1/tables/:id/metadata`)
 * con soporte para título, descripción, etiquetas chip, unidad de medida, glosario de columnas y filas de resumen.
 */
export const TableMetadataEditorModal: React.FC<TableMetadataEditorModalProps> = ({
  table,
  isOpen,
  onClose,
  onMetadataSaved,
}) => {
  const { showToast } = useToast();
  const [draftTableId, setDraftTableId] = useState<string | null>(table?.id ?? null);
  const initial = parseInitialMetadata(table?.metadataCard);

  const [title, setTitle] = useState<string>(initial.title || '');
  const [description, setDescription] = useState<string>(initial.description || '');
  const [tags, setTags] = useState<string[]>(initial.tags || []);
  const [tagInput, setTagInput] = useState<string>('');
  const [unit, setUnit] = useState<string>(initial.unit || '');
  const [columnsMeta, setColumnsMeta] = useState<Record<string, string>>(
    initial.columnsMeta || {}
  );
  const [hasSummaryRows, setHasSummaryRows] = useState<boolean>(Boolean(initial.hasSummaryRows));
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if ((table?.id ?? null) !== draftTableId) {
    const next = parseInitialMetadata(table?.metadataCard);
    setDraftTableId(table?.id ?? null);
    setTitle(next.title || '');
    setDescription(next.description || '');
    setTags(next.tags || []);
    setTagInput('');
    setUnit(next.unit || '');
    setColumnsMeta(next.columnsMeta || {});
    setHasSummaryRows(Boolean(next.hasSummaryRows));
  }

  if (!table) return null;

  const detectedColumns = Array.from(
    new Set([...(table.columns || []), ...Object.keys(columnsMeta)])
  );

  /**
   * Añade una etiqueta temática única a la lista de chips.
   */
  const handleAddTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  /**
   * Elimina una etiqueta temática de la lista de chips.
   */
  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  /**
   * Guarda los cambios de la ficha técnica en PostgreSQL (`PATCH /api/v1/tables/:id/metadata`).
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: MetadataCard = {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        tags,
        unit: unit.trim() || undefined,
        columnsMeta,
        hasSummaryRows,
      };
      const updated = await tablesService.updateTableMetadata(table.id, payload);
      showToast(`Ficha Técnica de '${table.tableName}' actualizada`, 'success');
      onMetadataSaved?.(updated);
      onClose();
    } catch (err: any) {
      showToast(
        err?.detail || err?.message || 'Error al guardar la Ficha Técnica del dataset',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-main)',
    fontSize: '0.84rem',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ficha Técnica — ${table.tableName}`} wide>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label htmlFor="meta-title-input" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
              Título Descriptivo
            </label>
            <input
              id="meta-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Censo Nacional de Población 2026"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label htmlFor="meta-unit-input" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
              Unidad de Medida
            </label>
            <input
              id="meta-unit-input"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Ej. habitantes, USD, toneladas"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label htmlFor="meta-description-input" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
            Descripción del Dataset
          </label>
          <textarea
            id="meta-description-input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe el contexto, fuente y alcance analítico de esta tabla..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="meta-tag-input" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
            Etiquetas Temáticas
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="meta-tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Añadir etiqueta (ej. demografía, finanzas)..."
              style={inputStyle}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={handleAddTag}
            >
              Agregar
            </Button>
          </div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999, background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600 }}
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Eliminar etiqueta ${tag}`}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {detectedColumns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
              Diccionario de Columnas ({detectedColumns.length})
            </span>
            <div
              style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: 8, borderRadius: 'var(--radius-sm)', background: 'rgba(15, 23, 42, 0.35)', border: '1px solid var(--border-subtle)' }}
            >
              {detectedColumns.map((col) => (
                <div key={col} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, alignItems: 'center' }}>
                  <code style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col}>
                    {col}
                  </code>
                  <input
                    type="text"
                    aria-label={`Significado de columna ${col}`}
                    value={columnsMeta[col] || ''}
                    onChange={(e) => setColumnsMeta((prev) => ({ ...prev, [col]: e.target.value }))}
                    placeholder={`Significado semántico de '${col}'...`}
                    style={{ ...inputStyle, padding: '5px 10px', fontSize: '0.78rem' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-main)', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={hasSummaryRows}
            onChange={(e) => setHasSummaryRows(e.target.checked)}
          />
          <FileText size={14} style={{ color: 'var(--accent-primary)' }} />
          <span>
            Incluye filas de resumen/totales (evitar duplicación de totales en análisis RAG)
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" icon={<Check size={15} />} loading={isSaving}>
            Guardar Ficha Técnica
          </Button>
        </div>
      </form>
    </Modal>
  );
};

