import React, { useState } from 'react';
import { FolderPlus, Lock, Globe } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { foldersService } from '../../services/foldersService';
import { storageService } from '../../services/storageService';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import type { FolderCategory, FolderItem } from '../../types/media';
import styles from './CreateFolderModal.module.css';

/**
 * Propiedades del modal de creación de carpetas en PostgreSQL.
 */
export interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: FolderCategory;
  parentFolder?: FolderItem | null;
  onFolderCreated: (folder: FolderItem) => void;
}

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

/**
 * Modal para crear una nueva carpeta o subcarpeta en PostgreSQL (`POST /api/v1/folders`)
 * respetando la jerarquía de 3 niveles (`CONTAINER` en Nivel 1, tipo especializado en Nivel 2 y herencia en Nivel 3).
 */
export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  type,
  parentFolder = null,
  onFolderCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [typeOverride, setTypeOverride] = useState<FolderCategory | null>(null);

  const isCollaboratorAtRoot = user?.role === 'COLLABORATOR' && !parentFolder;
  const defaultType: FolderCategory = typeOverride ?? type ?? (parentFolder?.type ?? 'container');
  const selectedType: FolderCategory = typeOverride ?? defaultType;

  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Envía la creación de la carpeta al backend o aplica respaldo local si está desconectado.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCollaboratorAtRoot) return;

    setLoading(true);
    try {
      const created = await foldersService.createFolder({
        name: name.trim(),
        type: selectedType,
        ...(parentFolder ? { parentId: parentFolder.id } : {}),
        color,
        isPrivate,
      });
      showToast(`Carpeta '${created.name}' creada`, 'success');
      onFolderCreated(created);
      setName('');
      setTypeOverride(null);
      setIsPrivate(false);
      onClose();
    } catch {
      const fallbackFolder: FolderItem = {
        id: `fld-${Date.now()}`,
        name: name.trim(),
        type: selectedType,
        parentId: parentFolder?.id ?? null,
        color,
        isPrivate,
        itemCount: 0,
        createdAt: new Date().toISOString(),
      };
      storageService.addFolder(fallbackFolder);
      showToast(`Carpeta '${fallbackFolder.name}' creada`, 'success');
      onFolderCreated(fallbackFolder);
      setName('');
      setTypeOverride(null);
      setIsPrivate(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const typeLabel =
    selectedType === 'container'
      ? 'Contenedor'
      : selectedType === 'image'
      ? 'Imágenes'
      : selectedType === 'table'
      ? 'Tablas'
      : 'PDFs';

  const title = parentFolder
    ? `Nueva Subcarpeta en "${parentFolder.name}" (${typeLabel})`
    : `Crear Carpeta (${typeLabel})`;

  const typeOptions = [
    { id: 'container', label: 'Contenedor' },
    { id: 'image', label: 'Imágenes' },
    { id: 'table', label: 'Tablas' },
    { id: 'pdf', label: 'PDFs' },
  ] as const;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {isCollaboratorAtRoot && (
          <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontSize: '0.76rem' }}>
            Los colaboradores solo pueden crear subcarpetas dentro de carpetas donde tengan permiso de edición (EDIT).
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="folder-name" className={styles.label}>
            Nombre de la carpeta o proyecto
          </label>
          <input
            id="folder-name"
            type="text"
            className={styles.input}
            placeholder="ej. Proyecto A, Campaña 2026..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading || isCollaboratorAtRoot}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Tipo de carpeta</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {typeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTypeOverride(opt.id)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  border: selectedType === opt.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: selectedType === opt.id ? 'var(--accent-primary-bg)' : 'var(--bg-card)',
                  color: selectedType === opt.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Color identificador</span>
          <div className={styles.colors}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.colorBtn} ${color === c ? styles.selected : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Visibilidad</span>
          <button
            type="button"
            onClick={() => setIsPrivate((prev) => !prev)}
            className={styles.privacyToggle}
            aria-label="Alternar privacidad de carpeta"
          >
            <div className={styles.privacyInfo}>
              {isPrivate ? (
                <Lock size={16} style={{ color: '#fbbf24' }} />
              ) : (
                <Globe size={16} style={{ color: 'var(--color-success)' }} />
              )}
              <div className={styles.privacyText}>
                <span className={styles.privacyTitle}>
                  {isPrivate ? 'Carpeta Privada' : 'Carpeta Pública'}
                </span>
                <span className={styles.privacySub}>
                  {isPrivate
                    ? 'Solo tú, colaboradores invitados y el ADMIN pueden acceder'
                    : 'Visible para los usuarios autorizados en el espacio'}
                </span>
              </div>
            </div>
          </button>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<FolderPlus size={16} />}
            loading={loading}
          >
            Crear Carpeta
          </Button>
        </div>
      </form>
    </Modal>
  );
};
