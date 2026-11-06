import React, { useState } from 'react';
import { FolderPlus, Lock, Globe } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { foldersService } from '../../services/foldersService';
import { storageService } from '../../services/storageService';
import { useToast } from '../../context/useToast';
import type { MediaCategory, FolderItem } from '../../types/media';
import styles from './CreateFolderModal.module.css';

/**
 * Propiedades del modal de creación de carpetas en PostgreSQL.
 */
export interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: MediaCategory;
  onFolderCreated: (folder: FolderItem) => void;
}

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

/**
 * Modal para crear una nueva carpeta de imágenes o tablas en PostgreSQL (`POST /api/v1/folders`).
 */
export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  type,
  onFolderCreated,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Envía la creación de la carpeta al backend o aplica respaldo local si está desconectado.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const created = await foldersService.createFolder({
        name: name.trim(),
        type,
        color,
        isPrivate,
      });
      showToast(`Carpeta '${created.name}' creada`, 'success');
      onFolderCreated(created);
      setName('');
      setIsPrivate(false);
      onClose();
    } catch {
      const fallbackFolder: FolderItem = {
        id: `fld-${Date.now()}`,
        name: name.trim(),
        type,
        color,
        isPrivate,
        itemCount: 0,
        createdAt: new Date().toISOString(),
      };
      storageService.addFolder(fallbackFolder);
      showToast(`Carpeta '${fallbackFolder.name}' creada`, 'success');
      onFolderCreated(fallbackFolder);
      setName('');
      setIsPrivate(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const title = `Crear Carpeta para ${type === 'image' ? 'Imágenes' : 'Datasets/Tablas'}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className={styles.form}>
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
            disabled={loading}
            autoFocus
          />
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
