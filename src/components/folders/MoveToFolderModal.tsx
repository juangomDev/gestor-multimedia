import React, { useMemo } from 'react';
import { Folder, FolderRoot, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { flattenFolderTree, getFolderPathLabel } from '../../services/foldersService';
import type { FolderItem } from '../../types/media';

/**
 * Propiedades del modal para mover un archivo individual a una carpeta o subcarpeta compatible.
 */
interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  currentFolderId: string | null;
  folders: FolderItem[];
  allFolders?: FolderItem[];
  onMove: (folderId: string | null) => void;
}

/**
 * Modal de reasignación de carpeta que soporta rutas jerárquicas de hasta 3 niveles (`Padre › Subcarpeta`).
 */
export const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  isOpen,
  onClose,
  itemName,
  currentFolderId,
  folders,
  allFolders,
  onMove,
}) => {
  const flatPool = useMemo(
    () => flattenFolderTree(allFolders && allFolders.length > 0 ? allFolders : folders),
    [allFolders, folders]
  );

  const selectableFolders = useMemo(
    () => flattenFolderTree(folders).filter((f) => f.type !== 'container'),
    [folders]
  );

  const handleSelect = (folderId: string | null) => {
    onMove(folderId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Mover "${itemName}" a carpeta`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          Selecciona el espacio o subcarpeta de destino:
        </p>

        {/* Opción Raíz */}
        <button
          onClick={() => handleSelect(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: currentFolderId === null ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
            border: currentFolderId === null ? '1px solid var(--primary)' : '1px solid var(--border)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderRoot size={16} color="var(--primary)" />
            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Sin carpeta (Raíz principal)</span>
          </div>
          {currentFolderId === null && <Check size={16} color="var(--primary)" />}
        </button>

        {/* Carpetas y subcarpetas registradas */}
        {selectableFolders.map((folder) => {
          const isCurrent = currentFolderId === folder.id;
          const pathLabel = getFolderPathLabel(folder, flatPool);
          return (
            <button
              key={folder.id}
              onClick={() => handleSelect(folder.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--border)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: folder.color || '#3b82f6',
                  }}
                />
                <Folder size={16} color={folder.color || 'var(--text-muted)'} />
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{pathLabel}</span>
              </div>
              {isCurrent && <Check size={16} color="var(--primary)" />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
