import React, { useState } from 'react';
import { Pencil, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { imagesService } from '../../services/imagesService';
import { useToast } from '../../context/useToast';
import type { ImageItem } from '../../types/media';

/**
 * Propiedades del modal de renombrado en caliente de imágenes (`PATCH /api/v1/images/:id`).
 */
export interface RenameImageModalProps {
  image: ImageItem | null;
  isOpen: boolean;
  onClose: () => void;
  onImageRenamed?: (updated: ImageItem) => void;
}

/**
 * Modal rápido para renombrar en caliente una imagen (`PATCH /api/v1/images/:id`)
 * actualizando el estado local inmediatamente y mostrando feedback toast.
 */
export const RenameImageModal: React.FC<RenameImageModalProps> = ({
  image,
  isOpen,
  onClose,
  onImageRenamed,
}) => {
  const { showToast } = useToast();
  const [draftImageId, setDraftImageId] = useState<string | null>(image?.id ?? null);
  const [originalName, setOriginalName] = useState<string>(image?.originalName ?? '');
  const [isSaving, setIsSaving] = useState(false);

  if ((image?.id ?? null) !== draftImageId) {
    const nextName = image?.originalName ?? '';
    setDraftImageId(image?.id ?? null);
    setOriginalName(nextName);
  }

  if (!image) return null;

  /**
   * Envía la petición `PATCH /api/v1/images/:id` para actualizar el nombre original del recurso.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = originalName.trim();
    if (!trimmed) {
      showToast('El nombre de la imagen no puede estar vacío', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await imagesService.renameImage(image.id, trimmed);
      showToast(`Imagen renombrada a '${updated.originalName}'`, 'success');
      onImageRenamed?.(updated);
      onClose();
    } catch (err: any) {
      showToast(
        err?.detail || err?.message || 'Error al renombrar la imagen en el servidor',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Renombrar Imagen">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>ShortCode público invariable:</span>
          <strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
            {image.shortCode}
          </strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            htmlFor="rename-image-input"
            style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}
          >
            Nuevo nombre del archivo
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Pencil
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              id="rename-image-input"
              type="text"
              value={originalName}
              onChange={(e) => setOriginalName(e.target.value)}
              placeholder="Ej. banner-principal.webp"
              autoFocus
              required
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Check size={15} />}
            loading={isSaving}
            disabled={!originalName.trim()}
          >
            Guardar Nombre
          </Button>
        </div>
      </form>
    </Modal>
  );
};
