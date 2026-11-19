import { createContext } from 'react';
import type { FolderItem, ImageItem, PdfItem } from '../../types/media';

/**
 * Solicitud para abrir directamente un visor lazy por `shortCode` (desde Explorador, `⌘K` o citas RAG).
 */
export interface ShortCodePreviewRequest {
  type: 'image' | 'pdf';
  shortCode: string;
  page?: number;
  /** Registro completo opcional de imagen (habilita metadatos y mutaciones en el Inspector). */
  image?: ImageItem;
  /** Registro completo opcional de PDF (habilita metadatos, ficha técnica y mutaciones). */
  pdf?: PdfItem;
  /** Indica si el usuario actual posee permisos de escritura (`EDIT`/`ADMIN`) sobre el recurso. */
  canEdit?: boolean;
}

/**
 * Estado y acciones transversales del App Shell v2 (`Sidebar`, `CommandPalette`, visores lazy y subidas).
 */
export interface ShellContextValue {
  /** Carpeta actualmente abierta según la ruta `/folder/:folderId`, o `null` en raíz/otras vistas. */
  activeFolder: FolderItem | null;
  /** Lista plana de carpetas disponibles en el árbol cargado. */
  allFolders: FolderItem[];
  /** Indica si la paleta rápida `⌘K` está abierta. */
  isCommandPaletteOpen: boolean;
  /** Abre la paleta rápida `⌘K`. */
  openCommandPalette: () => void;
  /** Cierra la paleta rápida `⌘K`. */
  closeCommandPalette: () => void;
  /** Abre el modal de cambio de contraseña propia. */
  openChangePassword: () => void;
  /** Dispara la acción contextual de subida registrada por la vista activa. */
  triggerContextualUpload: () => void;
  /** Registra el manejador de subida de la vista activa (devuelve función de limpieza). */
  registerUploadHandler: (handler: () => void) => () => void;
  /** Abre el visor lazy correspondiente (`ImageInspectorDialog` o `PdfViewerDialog`) para un `shortCode`. */
  openShortCodePreview: (preview: ShortCodePreviewRequest) => void;
  /** Cierra el visor rápido por `shortCode` actualmente abierto. */
  closeShortCodePreview: () => void;
  /** Solicitud de previsualización activa o `null`. */
  activePreview: ShortCodePreviewRequest | null;
}

/** Contexto React del App Shell v2. */
export const ShellContext = createContext<ShellContextValue | undefined>(undefined);
