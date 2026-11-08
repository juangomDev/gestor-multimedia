import React, { useState } from 'react';
import { Pencil, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { tablesService } from '../../services/tablesService';
import { useToast } from '../../context/useToast';
import type { TableItem } from '../../types/media';

/**
 * Propiedades del modal de renombrado en caliente de datasets tabulares (`PATCH /api/v1/tables/:id`).
 */
export interface RenameTableModalProps {
  table: TableItem | null;
  isOpen: boolean;
  onClose: () => void;
  onTableRenamed?: (updated: TableItem) => void;
}

/**
 * Modal para renombrar en caliente un dataset tabular (`PATCH /api/v1/tables/:id`),
 * actualizando el estado local inmediatamente y preservando su shortCode y URL pública intactos.
 */
export const RenameTableModal: React.FC<RenameTableModalProps> = ({
  table,
  isOpen,
  onClose,
  onTableRenamed,
}) => {
  const { showToast } = useToast();
  const [draftTableId, setDraftTableId] = useState<string | null>(table?.id ?? null);
  const [tableName, setTableName] = useState<string>(table?.tableName ?? '');
  const [isSaving, setIsSaving] = useState(false);

  if ((table?.id ?? null) !== draftTableId) {
    const nextName = table?.tableName ?? '';
    setDraftTableId(table?.id ?? null);
    setTableName(nextName);
  }

  if (!table) return null;

  /**
   * Envía la petición `PATCH /api/v1/tables/:id` para actualizar el nombre del archivo.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tableName.trim();
    if (!trimmed) {
      showToast('El nombre de la tabla no puede estar vacío', 'error');
      return;
    }

    if (trimmed === table.tableName) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const updated = await tablesService.renameTable(table.id, trimmed);
      showToast(`Dataset '${updated.tableName}' renombrado exitosamente`, 'success');
      onTableRenamed?.(updated);
      onClose();
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Error al renombrar el dataset';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Renombrar Dataset">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            background: 'var(--bg-panel)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span>ShortCode inmutable: </span>
          <strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
            {table.shortCode}
          </strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            htmlFor="table-rename-input"
            style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}
          >
            Nombre del Archivo Tabular
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="table-rename-input"
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Ej: balance_general_2026.xlsx"
              disabled={isSaving}
              autoFocus
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <Pencil
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSaving}
            disabled={isSaving || !tableName.trim()}
            icon={<Check size={16} />}
          >
            Guardar Nombre
          </Button>
        </div>
      </form>
    </Modal>
  );
};

