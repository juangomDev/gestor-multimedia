import React, { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { storageService } from '../../services/storageService';
import { useToast } from '../../context/useToast';
import type { MediaCategory, FolderItem } from '../../types/media';
import styles from './CreateFolderModal.module.css';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: MediaCategory;
  onFolderCreated: (folder: FolderItem) => void;
}

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  type,
  onFolderCreated,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newFolder: FolderItem = {
      id: `fld-${Date.now()}`,
      name: name.trim(),
      type,
      color,
      createdAt: new Date().toISOString(),
    };

    storageService.addFolder(newFolder);
    showToast(`Carpeta '${newFolder.name}' creada`, 'success');
    onFolderCreated(newFolder);
    setName('');
    onClose();
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

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" icon={<FolderPlus size={16} />}>
            Crear Carpeta
          </Button>
        </div>
      </form>
    </Modal>
  );
};
