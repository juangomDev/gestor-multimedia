import { useEffect, useState } from 'react';

/**
 * Estado de carga de la previsualización PDF mediante Blob local (`blob:`).
 */
export interface PdfBlobPreviewState {
  /** Estado actual de resolución del binario PDF. */
  status: 'loading' | 'ready' | 'fallback';
  /** URL base lista para montar el `<iframe>` (`blob:...` o URL remota de respaldo). */
  previewBaseUrl: string;
}

interface InternalBlobState {
  sourceUrl: string;
  status: 'ready' | 'fallback';
  blobUrl: string | null;
}

/**
 * Comprueba si el entorno de ejecución soporta `fetch` y `URL.createObjectURL`.
 */
function supportsBlobUrls(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof fetch === 'function' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function' &&
    typeof URL.revokeObjectURL === 'function'
  );
}

/**
 * Descarga un documento PDF remoto vía CORS y genera una URL `blob:` del mismo origen
 * para renderizarlo en `<iframe>` sin quedar bloqueado por cabeceras de servidor como
 * `X-Frame-Options: DENY` o `Content-Security-Policy: sandbox`.
 *
 * Si la descarga falla o el entorno no soporta `URL.createObjectURL` (por ejemplo jsdom),
 * degrada limpiamente a `sourceUrl`.
 *
 * @param sourceUrl URL remota versionada del documento PDF (`/p/:shortCode?v=...`).
 * @param enabled Activa la precarga únicamente mientras el visor está abierto.
 * @returns Estado de carga y URL base lista para concatenar `#page=N`.
 */
export function usePdfBlobUrl(sourceUrl: string, enabled: boolean): PdfBlobPreviewState {
  const canUseBlobs = supportsBlobUrls();
  const [state, setState] = useState<InternalBlobState | null>(null);
  const [prevEnabled, setPrevEnabled] = useState(enabled);

  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled);
    if (!enabled && state !== null) {
      setState(null);
    }
  }

  useEffect(() => {
    if (!enabled || !sourceUrl || !canUseBlobs) return;

    const controller = new AbortController();
    let createdObjectUrl: string | null = null;

    const loadPdfBlob = async () => {
      try {
        const response = await fetch(sourceUrl, {
          credentials: 'omit',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`PDF preview request failed with status ${response.status}`);
        }

        const contentType = (response.headers?.get('content-type') || '').toLowerCase();
        if (
          contentType &&
          !contentType.includes('pdf') &&
          !contentType.includes('octet-stream')
        ) {
          throw new Error(`Unexpected PDF content-type: ${contentType}`);
        }

        const rawBlob = await response.blob();
        if (controller.signal.aborted) return;

        const pdfBlob =
          rawBlob.type === 'application/pdf'
            ? rawBlob
            : new Blob([rawBlob], { type: 'application/pdf' });

        createdObjectUrl = URL.createObjectURL(pdfBlob);
        setState({ sourceUrl, status: 'ready', blobUrl: createdObjectUrl });
      } catch {
        if (controller.signal.aborted) return;
        setState({ sourceUrl, status: 'fallback', blobUrl: null });
      }
    };

    void loadPdfBlob();

    return () => {
      controller.abort();
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [sourceUrl, enabled, canUseBlobs]);

  if (!enabled || !sourceUrl || !canUseBlobs) {
    return { status: 'fallback', previewBaseUrl: sourceUrl };
  }

  if (!state || state.sourceUrl !== sourceUrl) {
    return { status: 'loading', previewBaseUrl: sourceUrl };
  }

  if (state.status === 'ready' && state.blobUrl) {
    return { status: 'ready', previewBaseUrl: state.blobUrl };
  }

  return { status: 'fallback', previewBaseUrl: sourceUrl };
}
