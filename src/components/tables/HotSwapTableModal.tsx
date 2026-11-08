import React, { useState, useRef } from 'react';
import { RefreshCw, Upload, AlertTriangle, ArrowRight, FileSpreadsheet } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { tablesService } from '../../services/tablesService';
import { formatBytes } from '../../utils/formatters';
import { useToast } from '../../context/useToast';
import type { TableItem } from '../../types/media';

/**
 * Propiedades del modal de reemplazo binario en caliente (Hot-Swap) de tablas (`PUT /api/v1/tables/:id`).
 */
export interface HotSwapTableModalProps {
  table: TableItem | null;
  isOpen: boolean;
  onClose: () => void;
  onTableReplaced?: (updated: TableItem) => void;
}

/**
 * Modal con dropzone interactivo y comparativa Antes/Después para reemplazar el binario
 * de un dataset tabular (`PUT /api/v1/tables/:id`) conservando su `shortCode` y URL pública intactos.
 */
export const HotSwapTableModal: React.FC<HotSwapTableModalProps> = ({
  table,
  isOpen,
  onClose,
  onTableReplaced,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draftTableId, setDraftTableId] = useState<string | null>(table?.id ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if ((table?.id ?? null) !== draftTableId) {
    setDraftTableId(table?.id ?? null);
    setSelectedFile(null);
    setIsDragging(false);
  }

  if (!table) return null;

  /**
   * Valida que el archivo seleccionado tenga una extensión soportada (.csv, .xlsx, .xls).
   */
  const handleValidateAndSelectFile = (file: File) => {
    const isSupported =
      file.type === 'text/csv' ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel') ||
      /\.(csv|xlsx|xls)$/i.test(file.name);

    if (!isSupported) {
      showToast('Formato no soportado. Selecciona un archivo .csv o .xlsx', 'error');
      return;
    }

    setSelectedFile(file);
  };

  /**
   * Manejador de selección de archivo mediante el diálogo del sistema operativo.
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleValidateAndSelectFile(file);
    }
  };

  /**
   * Ejecuta la solicitud `PUT /api/v1/tables/:id` de sustitución atómica.
   */
  const handleConfirmReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Debes seleccionar un archivo para sustituir la tabla', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const updated = await tablesService.replaceTable(table.id, selectedFile);
      showToast(`Dataset '${updated.tableName}' reemplazado exitosamente en caliente`, 'success');
      onTableReplaced?.(updated);
      onClose();
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Error al reemplazar el dataset';
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reemplazar Dataset en Caliente (Hot-Swap)">
      <form onSubmit={handleConfirmReplace} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-warning, #eab308)',
            fontSize: '0.8125rem',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>
            El archivo se actualizará conservando exactamente el mismo <strong>shortCode</strong> (
            <code>{table.shortCode}</code>) y su URL pública compartida.
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 12,
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-panel)',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              ARCHIVO ACTUAL
            </span>
            <div
              style={{
                height: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-sm)',
                gap: 6,
              }}
            >
              <FileSpreadsheet size={32} style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {table.rowCount} filas
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>
              {table.tableName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {formatBytes(table.sizeBytes)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <ArrowRight size={20} />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleValidateAndSelectFile(file);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 12,
              border: `1px dashed ${selectedFile ? 'var(--color-success)' : isDragging ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              background: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-panel)',
              transition: 'border-color 0.2s',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: selectedFile ? 'var(--color-success)' : 'var(--accent-primary)' }}>
              {selectedFile ? 'NUEVO ARCHIVO' : 'SELECCIONAR REEMPLAZO'}
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />

            {selectedFile ? (
              <>
                <div
                  style={{
                    height: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    gap: 6,
                  }}
                >
                  <FileSpreadsheet size={32} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
                    Listo para sustituir
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatBytes(selectedFile.size)}
                </div>
              </>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  height: 145,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                <Upload size={24} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  Arrastra o haz clic para subir
                </span>
                <span style={{ fontSize: '0.72rem' }}>Archivos .CSV o .XLSX (máx 100MB)</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isUploading}
            disabled={!selectedFile || isUploading}
            icon={<RefreshCw size={16} />}
          >
            Confirmar Reemplazo
          </Button>
        </div>
      </form>
    </Modal>
  );
};

