import React, { useState, useMemo } from 'react';
import { Folder, Check, FolderInput } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { flattenFolderTree, getFolderPathLabel } from '../../services/foldersService';
import type { FolderItem, MediaCategory } from '../../types/media';

/**
 * Propiedades del modal para reasignar múltiples elementos a otra carpeta en lote.
 */
export interface BulkMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  category: MediaCategory;
  folders: FolderItem[];
  onConfirm: (targetFolderId: string) => Promise<void>;
}

/**
 * Modal para seleccionar una carpeta o subcarpeta de destino y reasignar masivamente los elementos seleccionados
 * (`POST /api/v1/images/bulk-move` o `POST /api/v1/tables/bulk-move`).
 */
export const BulkMoveModal: React.FC<BulkMoveModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  category,
  folders,
  onConfirm,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const flatFolders = useMemo(() => flattenFolderTree(folders), [folders]);
  const compatibleFolders = useMemo(
    () => flatFolders.filter((f) => f.type === category),
    [flatFolders, category]
  );

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (!selectedFolderId) return;
    setIsMoving(true);
    try {
      await onConfirm(selectedFolderId);
      onClose();
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mover ${selectedCount} ${category === 'image' ? 'imágenes' : 'datasets'} en lote`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Selecciona la carpeta de destino compatible para los elementos seleccionados:
        </p>

        <div
          style={{
            maxHeight: 280,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 2,
          }}
        >
          {compatibleFolders.length === 0 ? (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              No existen carpetas creadas para esta categoría.
            </div>
          ) : (
            compatibleFolders.map((folder) => {
              const isSelected = selectedFolderId === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-panel)',
                    border: isSelected
                      ? '1px solid var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Folder
                      size={18}
                      style={{
                        color: folder.color || 'var(--accent-primary)',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {getFolderPathLabel(folder, flatFolders)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {folder.itemCount ?? 0} elementos
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check size={16} style={{ color: 'var(--accent-primary)' }} />}
                </button>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isMoving}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={isMoving}
            disabled={!selectedFolderId || isMoving}
            icon={<FolderInput size={16} />}
            onClick={handleExecute}
          >
            Mover {selectedCount} elementos
          </Button>
        </div>
      </div>
    </Modal>
  );
};
