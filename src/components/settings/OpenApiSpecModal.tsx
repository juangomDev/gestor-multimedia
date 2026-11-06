import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Download, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { healthService } from '../../services/healthService';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/useToast';
import styles from './DiagnosticsCards.module.css';

/**
 * Propiedades del inspector de la especificación OpenAPI cruda.
 */
export interface OpenApiSpecModalProps {
  onClose: () => void;
}

/**
 * Extrae un resumen legible (versión OpenAPI, título, versión de API y número de rutas).
 * @param spec Documento OpenAPI parseado.
 * @returns Lista de etiquetas resumen.
 */
function summarizeSpec(spec: Record<string, unknown>): string[] {
  const info = (spec.info ?? {}) as { title?: string; version?: string };
  const paths = (spec.paths ?? {}) as Record<string, unknown>;
  return [
    `OpenAPI ${String(spec.openapi ?? spec.swagger ?? '?')}`,
    info.title ? `${info.title} v${info.version ?? '?'}` : 'Sin título',
    `${Object.keys(paths).length} rutas`,
  ];
}

/**
 * Modal que descarga `GET /openapi.json`, lo muestra formateado y permite copiarlo o descargarlo.
 * Se monta únicamente mientras está abierto, por lo que inicia la carga al montarse.
 */
export const OpenApiSpecModal: React.FC<OpenApiSpecModalProps> = ({ onClose }) => {
  const { showToast } = useToast();
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSpec = useCallback(
    () =>
      healthService
        .fetchOpenApiSpec()
        .then((data) => {
          setSpec(data);
          setError(null);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'No se pudo obtener /openapi.json');
        })
        .finally(() => setIsLoading(false)),
    []
  );

  useEffect(() => {
    void loadSpec();
  }, [loadSpec]);

  const formatted = spec ? JSON.stringify(spec, null, 2) : '';

  /** Recarga manual de la especificación. */
  const handleReload = () => {
    setIsLoading(true);
    void loadSpec();
  };

  /** Copia el JSON formateado al portapapeles. */
  const handleCopy = async () => {
    const ok = await copyToClipboard(formatted);
    showToast(ok ? 'Especificación OpenAPI copiada' : 'No se pudo copiar el JSON', ok ? 'success' : 'error');
  };

  /** Descarga el JSON formateado como archivo `openapi.json`. */
  const handleDownload = () => {
    const blob = new Blob([formatted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'openapi.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen onClose={onClose} title="Especificación OpenAPI (openapi.json)" wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.linkBtn} onClick={handleCopy} disabled={!spec}>
            <Copy size={14} />
            <span>Copiar JSON</span>
          </button>
          <button type="button" className={styles.linkBtn} onClick={handleDownload} disabled={!spec}>
            <Download size={14} />
            <span>Descargar openapi.json</span>
          </button>
          <button type="button" className={styles.linkBtn} onClick={handleReload} disabled={isLoading}>
            <RefreshCw size={14} />
            <span>Recargar</span>
          </button>
        </div>

        {isLoading && <span className={styles.specMeta}>Cargando especificación…</span>}
        {!isLoading && error && <span className={styles.errorText}>Error: {error}</span>}
        {!isLoading && spec && (
          <>
            <div className={styles.specMeta}>
              {summarizeSpec(spec).map((label) => (
                <span key={label} className={`${styles.badge} ${styles.badgeOk}`}>
                  {label}
                </span>
              ))}
            </div>
            <pre className={styles.jsonViewer} aria-label="JSON de la especificación OpenAPI">
              {formatted}
            </pre>
          </>
        )}
      </div>
    </Modal>
  );
};
