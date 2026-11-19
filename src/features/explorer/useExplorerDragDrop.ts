import { useRef, useState } from 'react';
import type React from 'react';

/**
 * Propiedades de configuración para el controlador de arrastre de archivos del explorador.
 */
export interface UseExplorerDragDropOptions {
  /** Indica si la carpeta activa permite subir archivos. */
  canUpload: boolean;
  /** Mensaje informativo cuando la ubicación actual bloquea la subida. */
  blockedMessage?: string | null;
  /** Callback ejecutado con los archivos soltados cuando la subida está habilitada. */
  onFilesAccepted: (files: File[]) => void;
  /** Callback ejecutado cuando se intentan soltar archivos en una ubicación bloqueada. */
  onBlockedDrop: (reason: string) => void;
}

/**
 * Encapsula los eventos Drag & Drop del Explorador evitando parpadeos por hijos DOM
 * mediante un contador de profundidad (`dragDepthRef`).
 */
export function useExplorerDragDrop({
  canUpload,
  blockedMessage,
  onFilesAccepted,
  onBlockedDrop,
}: UseExplorerDragDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  const onDragEnter = (event: React.DragEvent) => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const onDragOver = (event: React.DragEvent) => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    event.preventDefault();
  };

  const onDragLeave = (event: React.DragEvent) => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);

    const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
    if (droppedFiles.length === 0) return;

    if (!canUpload) {
      onBlockedDrop(blockedMessage || 'No puedes subir archivos en esta ubicación.');
      return;
    }

    onFilesAccepted(droppedFiles);
  };

  return {
    isDragging,
    dragHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
