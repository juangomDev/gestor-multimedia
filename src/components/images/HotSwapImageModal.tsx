import React, { useState, useRef } from 'react';
import { RefreshCw, Upload, AlertTriangle, ArrowRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { imagesService } from '../../services/imagesService';
import { formatBytes } from '../../utils/formatters';
import { useToast } from '../../context/useToast';
import type { ImageItem } from '../../types/media';

/**
 * Propiedades del modal de reemplazo binario en caliente (Hot-Swap) de imágenes (`PUT /api/v1/images/:id`).
 */
export interface HotSwapImageModalProps {
  image: ImageItem | null;
  isOpen: boolean;
  onClose: () => void;
  onImageReplaced?: (updated: ImageItem) => void;
}

/**
 * Modal con dropzone interactivo y vista comparativa Antes/Después para reemplazar el binario
 * de una imagen en caliente (`PUT /api/v1/images/:id`) manteniendo intacto su `shortCode`.
 */
export const HotSwapImageModal: React.FC<HotSwapImageModalProps> = ({
  image,
  isOpen,
  onClose,
  onImageReplaced,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draftImageId, setDraftImageId] = useState<string | null>(image?.id ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if ((image?.id ?? null) !== draftImageId) {
    setDraftImageId(image?.id ?? null);
    setSelectedFile(null);
    setPreviewObjectUrl(null);
    setIsDragging(false);
  }

  if (!image) return null;

  const currentThumbUrl =
    image.demoPreviewUrl || imagesService.getImageVariantUrl(image, 'thumb');

  /**
   * Asigna el archivo candidato para el reemplazo y genera su URL de previsualización local.
   */
  const handleSelectFile = (file: File | undefined | null) => {
    if (!file) return;
    const isImage =
      file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
    if (!isImage) {
      showToast(`El archivo '${file.name}' no es una imagen válida`, 'error');
      return;
    }
    setSelectedFile(file);
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      try {
        setPreviewObjectUrl(URL.createObjectURL(file));
      } catch {
        setPreviewObjectUrl(null);
      }
    }
  };

  /**
   * Ejecuta el reemplazo en caliente (`PUT /api/v1/images/:id`) y actualiza metadatos y versión de caché.
   */
  const handleConfirmReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const updated = await imagesService.replaceImage(image.id, selectedFile);
      showToast(
        `Binario reemplazado con éxito (${updated.shortCode} mantiene su URL pública)`,
        'success'
      );
      onImageReplaced?.(updated);
      onClose();
    } catch (err: any) {
      showToast(
        err?.detail || err?.message || 'Error al reemplazar el archivo de imagen',
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reemplazar Archivo en Caliente (Hot-Swap)" wide>
      <form onSubmit={handleConfirmReplace} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          role="note"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fcd34d',
            fontSize: '0.8125rem',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>
            El archivo se actualizará conservando exactamente el mismo shortCode y URL pública compartida
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: 12,
            alignItems: 'stretch',
          }}
        >
          {/* Panel Antes (Archivo Actual) */}
          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              ARCHIVO ACTUAL ({image.shortCode})
            </span>
            <div
              style={{
                height: 120,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={currentThumbUrl}
                alt={image.originalName}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {image.originalName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tamaño: {formatBytes(image.sizeBytes)} • {image.mimeType}
              {image.width && image.height ? ` • ${image.width}×${image.height}px` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <ArrowRight size={20} />
          </div>

          {/* Panel Después (Dropzone Interactivo) */}
          <div
            data-testid="hotswap-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleSelectFile(e.dataTransfer.files?.[0]);
            }}
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: isDragging ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-elevated)',
              border: `1px dashed ${
                selectedFile ? 'var(--accent-primary)' : 'var(--border-subtle)'
              }`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              NUEVO ARCHIVO A SUSTITUIR
            </span>
            <input
              ref={fileInputRef}
              data-testid="hotswap-file-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleSelectFile(e.target.files?.[0])}
            />
            {selectedFile ? (
              <>
                <div
                  style={{
                    height: 120,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {previewObjectUrl ? (
                    <img
                      src={previewObjectUrl}
                      alt={selectedFile.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <Upload size={24} />
                  )}
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Nuevo tamaño: {formatBytes(selectedFile.size)} • {selectedFile.type || 'image/*'}
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  padding: '20px 8px',
                }}
              >
                <Upload size={24} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  Arrastra o selecciona la nueva imagen
                </span>
                <span style={{ fontSize: '0.72rem' }}>PNG, JPG, WEBP, GIF o SVG</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<RefreshCw size={15} />}
            loading={isUploading}
            disabled={!selectedFile}
          >
            Reemplazar Binario
          </Button>
        </div>
      </form>
    </Modal>
  );
};
