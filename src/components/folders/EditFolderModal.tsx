import React, { useState, useRef } from 'react';
import { Save, Lock, Globe, AlertCircle, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { foldersService } from '../../services/foldersService';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import type { FolderItem } from '../../types/media';
import styles from './CreateFolderModal.module.css';

/**
 * Propiedades del modal de edición de carpetas (`PATCH /api/v1/folders/:id`).
 */
export interface EditFolderModalProps {
  folder: FolderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onFolderUpdated: (updatedFolder: FolderItem) => void;
}

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

/**
 * Modal de edición de propiedades de carpeta (nombre, color hexadecimal y privacidad).
 * Bloquea cualquier cambio si la carpeta es `General` o si el usuario no es propietario ni `ADMIN`.
 */
export const EditFolderModal: React.FC<EditFolderModalProps> = ({
  folder,
  isOpen,
  onClose,
  onFolderUpdated,
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [draftFolderId, setDraftFolderId] = useState<string | null>(folder?.id ?? null);
  const [name, setName] = useState(folder?.name ?? '');
  const [color, setColor] = useState<string>(folder?.color || PRESET_COLORS[0]);
  const [isPrivate, setIsPrivate] = useState<boolean>(Boolean(folder?.isPrivate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestValuesRef = useRef({
    folderId: folder?.id ?? null,
    name: folder?.name ?? '',
    color: folder?.color || PRESET_COLORS[0],
    isPrivate: Boolean(folder?.isPrivate),
  });

  if ((folder?.id ?? null) !== draftFolderId) {
    setDraftFolderId(folder?.id ?? null);
    setName(folder?.name ?? '');
    setColor(folder?.color || PRESET_COLORS[0]);
    setIsPrivate(Boolean(folder?.isPrivate));
    setError(null);
  }

  if (!isOpen || !folder) return null;

  const isSystemGeneral = folder.name.trim().toLowerCase() === 'general';
  const isOwnerOrAdmin =
    currentUser?.role === 'ADMIN' ||
    folder.myPermission === 'ADMIN' ||
    !folder.userId ||
    folder.userId === currentUser?.id;

  const isBlocked = isSystemGeneral || !isOwnerOrAdmin;

  /**
   * Actualiza el nombre en estado y referencia sincrónica.
   */
  const handleNameChange = (nextName: string) => {
    latestValuesRef.current.folderId = folder.id;
    latestValuesRef.current.name = nextName;
    setName(nextName);
  };

  /**
   * Actualiza el color hexadecimal seleccionado.
   */
  const handleColorSelect = (nextColor: string) => {
    if (isBlocked) return;
    latestValuesRef.current.folderId = folder.id;
    latestValuesRef.current.color = nextColor;
    setColor(nextColor);
  };

  /**
   * Alterna la privacidad de la carpeta.
   */
  const handlePrivacyToggle = () => {
    if (isBlocked) return;
    const basePrivate =
      latestValuesRef.current.folderId === folder.id
        ? latestValuesRef.current.isPrivate
        : Boolean(folder.isPrivate);
    const nextPrivate = !basePrivate;
    latestValuesRef.current.folderId = folder.id;
    latestValuesRef.current.isPrivate = nextPrivate;
    setIsPrivate(nextPrivate);
  };

  /**
   * Guarda los cambios de la carpeta enviando `PATCH /api/v1/folders/:id`.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    const currentVals =
      latestValuesRef.current.folderId === folder.id
        ? latestValuesRef.current
        : {
            name,
            color,
            isPrivate,
          };

    const cleanName = currentVals.name.trim();
    if (!cleanName) {
      setError('El nombre de la carpeta no puede estar vacío.');
      return;
    }

    if (cleanName.toLowerCase() === 'general') {
      setError('No se puede utilizar el nombre reservado del sistema "General".');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const updated = await foldersService.updateFolder(folder.id, {
        name: cleanName,
        color: currentVals.color,
        isPrivate: currentVals.isPrivate,
      });
      showToast(`Carpeta '${updated.name}' actualizada`, 'success');
      onFolderUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Error al actualizar la carpeta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar carpeta: ${folder.name}`}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {isSystemGeneral && (
          <div className={styles.alertWarning} role="alert">
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>
              La carpeta del sistema <strong>General</strong> está protegida y no puede ser
              renombrada ni modificada.
            </span>
          </div>
        )}

        {!isSystemGeneral && !isOwnerOrAdmin && (
          <div className={styles.alertWarning} role="alert">
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>
              Acceso restringido: Solo el propietario de la carpeta o un <strong>ADMIN</strong>{' '}
              pueden editar sus propiedades.
            </span>
          </div>
        )}

        {error && (
          <div className={styles.alertError} role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="edit-folder-name" className={styles.label}>
            Nuevo nombre de carpeta
          </label>
          <input
            id="edit-folder-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={isBlocked || loading}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Paleta de colores hexadecimales</span>
          <div className={styles.colors}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.colorBtn} ${color === c ? styles.selected : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => handleColorSelect(c)}
                disabled={isBlocked || loading}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Privacidad de la carpeta</span>
          <button
            type="button"
            onClick={handlePrivacyToggle}
            className={styles.privacyToggle}
            disabled={isBlocked || loading}
            aria-label="Alternar privacidad"
          >
            <div className={styles.privacyInfo}>
              {isPrivate ? (
                <Lock size={16} style={{ color: '#fbbf24' }} />
              ) : (
                <Globe size={16} style={{ color: 'var(--color-success)' }} />
              )}
              <div className={styles.privacyText}>
                <span className={styles.privacyTitle}>
                  {isPrivate ? 'Privada' : 'Pública'}
                </span>
                <span className={styles.privacySub}>
                  {isPrivate
                    ? 'Acceso restringido al propietario, miembros invitados y ADMIN'
                    : 'Accesible para los usuarios autorizados'}
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
            icon={<Save size={16} />}
            disabled={isBlocked}
            loading={loading}
          >
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
};
