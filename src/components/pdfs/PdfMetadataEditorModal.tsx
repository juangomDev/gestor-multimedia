import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { pdfsService } from '../../services/pdfsService';
import { useToast } from '../../context/useToast';
import type { PdfItem, PdfMetadataCard } from '../../types/media';

/**
 * Propiedades del editor de ficha técnica de PDF.
 */
export interface PdfMetadataEditorModalProps {
  pdf: PdfItem | null;
  isOpen: boolean;
  onClose: () => void;
  onMetadataUpdated: (updated: PdfItem) => void;
}

/**
 * Modal para editar la ficha técnica semántica de un documento PDF.
 */
export const PdfMetadataEditorModal: React.FC<PdfMetadataEditorModalProps> = ({
  pdf,
  isOpen,
  onClose,
  onMetadataUpdated,
}) => {
  const { showToast } = useToast();
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [keywords, setKeywords] = useState('');
  const [lastPdfId, setLastPdfId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (pdf && pdf.id !== lastPdfId) {
    setLastPdfId(pdf.id);
    setCategory(pdf.metadataCard?.category || '');
    setSummary(pdf.metadataCard?.summary || '');
    setKeywords((pdf.metadataCard?.keywords || []).join(', '));
  }

  if (!isOpen || !pdf) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const parsedKeywords = keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const metadata: PdfMetadataCard = {
      category: category.trim() || undefined,
      summary: summary.trim() || undefined,
      keywords: parsedKeywords.length > 0 ? parsedKeywords : undefined,
    };

    try {
      const updated = await pdfsService.updatePdfMetadata(pdf.id, metadata);
      showToast('Ficha técnica semántica actualizada', 'success');
      onMetadataUpdated(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la ficha técnica';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ficha Técnica Semántica (PDF)">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="pdf-cat-input" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Categoría del Documento
          </label>
          <input
            id="pdf-cat-input"
            type="text"
            placeholder="Ej: Legal, Financiero, Recursos Humanos..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              padding: '9px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="pdf-sum-input" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Resumen Ejecutivo
          </label>
          <textarea
            id="pdf-sum-input"
            rows={3}
            placeholder="Breve síntesis de los puntos críticos del documento..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={{
              padding: '9px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="pdf-kw-input" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Palabras Clave (separadas por comas)
          </label>
          <input
            id="pdf-kw-input"
            type="text"
            placeholder="contrato, 2026, confidencialidad, firma"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            style={{
              padding: '9px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            icon={isSubmitting ? undefined : <Save size={14} />}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Ficha'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
