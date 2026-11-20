import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  BookOpen,
  Download,
  ExternalLink,
  Eye,
  RefreshCw,
  Save,
  Server,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../context/useToast';
import { useHealthQuery } from '../../queries/useAdminQueries';
import { queryKeys } from '../../queries/queryKeys';
import { healthService } from '../../services/healthService';
import { storageService } from '../../services/storageService';
import { ShellContext } from '../shell/shellContextDef';
import { triggerBlobDownload } from '../forms/formHelpers';
import { formatDate, formatUptime, validateHttpBaseUrl } from '../../utils/formatters';
import styles from './AdminShared.module.css';

type PreviewKind = 'image' | 'table' | 'pdf';

function cleanCodeInput(raw: string): string {
  const trimmed = raw.trim();
  const urlMatch = trimmed.match(/\/(?:i|t|p)\/([a-zA-Z0-9_-]+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  return trimmed.replace(/^(?:i|t|p)\//i, '').trim();
}

/**
 * Panel `/admin/system` (exclusivo `ADMIN`): edición de URL base de `monolith-backend`,
 * diagnóstico detallado de `GET /health`, previsualizador rápido por `shortCode` (`/i/`, `/t/`, `/p/`),
 * visor interactivo Scalar (`/docs`) y descarga de `/openapi.json`.
 */
export const SystemPanel: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const shell = useContext(ShellContext);
  const { showToast } = useToast();

  const healthQuery = useHealthQuery();

  const [baseUrlInput, setBaseUrlInput] = useState(() => storageService.getApiBaseUrl());
  const [previewKind, setPreviewKind] = useState<PreviewKind>('image');
  const [shortCodeInput, setShortCodeInput] = useState('');
  const [showScalarFrame, setShowScalarFrame] = useState(false);
  const [downloadingSpec, setDownloadingSpec] = useState(false);

  const health = healthQuery.data;
  const isInitialHealth = healthQuery.isLoading && !health;
  const docsUrl = healthService.getDocsUrl();
  const openApiUrl = healthService.getOpenApiUrl();

  const handleSaveBaseUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = validateHttpBaseUrl(baseUrlInput);
    if (!cleaned) {
      showToast('Introduce una URL HTTP o HTTPS válida para el servidor API.', 'warning');
      return;
    }
    const savedUrl = storageService.setApiBaseUrl(cleaned);
    setBaseUrlInput(savedUrl);
    queryClient.clear();
    const result = await queryClient.fetchQuery({
      queryKey: queryKeys.health.status(),
      queryFn: () => healthService.checkHealth(),
    });
    if (result.status === 'ok') {
      showToast(`Conectado a ${savedUrl} (${result.latencyMs ?? 0} ms).`, 'success');
    } else {
      showToast(`URL guardada (${savedUrl}), pero /health responde degradado.`, 'warning');
    }
  };

  const handleQuickPreview = (e: React.FormEvent) => {
    e.preventDefault();
    const code = cleanCodeInput(shortCodeInput);
    if (!code) return;

    const prefixMatch = shortCodeInput.trim().match(/(?:^|\/)(i|t|p)\/[a-zA-Z0-9_-]+/i);
    const kind: PreviewKind = prefixMatch?.[1]
      ? prefixMatch[1].toLowerCase() === 'i'
        ? 'image'
        : prefixMatch[1].toLowerCase() === 't'
        ? 'table'
        : 'pdf'
      : previewKind;

    if (kind === 'table') {
      navigate(`/tables/${encodeURIComponent(code)}`);
      return;
    }
    shell?.openShortCodePreview({ type: kind, shortCode: code });
  };

  const handleDownloadOpenApi = async () => {
    setDownloadingSpec(true);
    try {
      const spec = await healthService.fetchOpenApiSpec();
      const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
      triggerBlobDownload(blob, 'openapi.json');
      showToast('Especificación openapi.json descargada.', 'success');
    } catch {
      showToast('No se pudo descargar /openapi.json del servidor.', 'error');
    } finally {
      setDownloadingSpec(false);
    }
  };

  return (
    <div className={styles.panel} data-testid="admin-system-panel">
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Conexión con monolith-backend</h2>
            <p className={styles.sectionDesc}>
              URL base activa utilizada por el cliente HTTP y el canal SSE de notificaciones.
            </p>
          </div>
          <Server size={18} aria-hidden="true" />
        </div>

        <form className={styles.inlineForm} onSubmit={(e) => void handleSaveBaseUrl(e)}>
          <div className={styles.grow}>
            <Input
              label="URL base del servidor API"
              value={baseUrlInput}
              onChange={(e) => setBaseUrlInput(e.target.value)}
              placeholder="http://localhost:3000"
              mono
              required
              data-testid="system-api-url-input"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            icon={<Save size={14} />}
            loading={healthQuery.isFetching}
            data-testid="system-save-url-btn"
          >
            Guardar y probar
          </Button>
        </form>
      </section>

      <section className={styles.sectionCard} data-testid="system-health-section">
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Diagnóstico de salud (GET /health)</h2>
            <p className={styles.sectionDesc}>
              {health?.timestamp
                ? `Última comprobación: ${formatDate(health.timestamp)}`
                : 'Comprobando disponibilidad de base de datos y almacenamiento...'}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            loading={healthQuery.isFetching}
            onClick={() => void healthQuery.refetch()}
            data-testid="system-refresh-health-btn"
          >
            Refrescar /health
          </Button>
        </div>

        <div className={styles.cardGrid}>
          <div className={`${styles.metricCard} ${styles.spineAccent}`}>
            <span className={styles.metricLabel}>Estado global</span>
            <span className={styles.metricValue}>
              <Badge tone={isInitialHealth ? 'neutral' : health?.status === 'ok' ? 'ok' : 'danger'} mono>
                {isInitialHealth ? '...' : (health?.status || 'degraded').toUpperCase()}
              </Badge>
            </span>
            <span className={styles.metricSub}>
              <Activity size={11} aria-hidden="true" /> Latencia: {health?.latencyMs ?? 0} ms
            </span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>PostgreSQL</span>
            <span className={styles.metricValue}>
              <Badge tone={isInitialHealth ? 'neutral' : health?.db === 'up' ? 'ok' : 'danger'} mono>
                {isInitialHealth ? '...' : (health?.db || 'down').toUpperCase()}
              </Badge>
            </span>
            <span className={styles.metricSub}>Motor relacional y Prisma</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Almacenamiento</span>
            <span className={styles.metricValue}>
              <Badge tone={isInitialHealth ? 'neutral' : health?.storage === 'writable' ? 'ok' : 'danger'} mono>
                {isInitialHealth ? '...' : (health?.storage || 'unwritable').toUpperCase()}
              </Badge>
            </span>
            <span className={styles.metricSub}>Permiso de escritura en disco</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Tiempo activo</span>
            <span className={styles.metricValue}>
              {health?.uptime !== undefined ? formatUptime(health.uptime) : '—'}
            </span>
            <span className={styles.metricSub}>Proceso monolith-backend</span>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div>
          <h2 className={styles.sectionTitle}>Previsualizador rápido por código corto</h2>
          <p className={styles.sectionDesc}>
            Abre directamente una imagen (/i/), tabla (/t/) o documento PDF (/p/) desde su código corto o URL pública.
          </p>
        </div>

        <form className={styles.inlineForm} onSubmit={handleQuickPreview}>
          <select
            aria-label="Tipo de recurso a previsualizar"
            className={styles.select}
            value={previewKind}
            onChange={(e) => setPreviewKind(e.target.value as PreviewKind)}
            data-testid="system-preview-kind"
          >
            <option value="image">Imagen (/i/)</option>
            <option value="table">Tabla (/t/)</option>
            <option value="pdf">Documento PDF (/p/)</option>
          </select>

          <div className={styles.grow}>
            <Input
              value={shortCodeInput}
              onChange={(e) => setShortCodeInput(e.target.value)}
              placeholder="Ej. k9x2a o /p/aB3k9"
              mono
              aria-label="Código corto para previsualizar"
              data-testid="system-preview-code-input"
            />
          </div>

          <Button type="submit" variant="secondary" icon={<Eye size={14} />} disabled={!shortCodeInput.trim()} data-testid="system-preview-open-btn">
            Abrir visor
          </Button>
        </form>
      </section>

      <section className={styles.sectionCard} data-testid="system-openapi-section">
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Documentación interactiva Scalar & OpenAPI 3.1</h2>
            <p className={styles.sectionDesc}>
              Inspecciona los 75 endpoints de <code>monolith-backend</code> o descarga el contrato JSON completo.
            </p>
          </div>
          <div className={styles.filterCluster}>
            <Button variant="secondary" size="sm" icon={<BookOpen size={14} />} onClick={() => setShowScalarFrame((prev) => !prev)} data-testid="system-toggle-scalar-btn">
              {showScalarFrame ? 'Ocultar visor Scalar' : 'Abrir visor Scalar aquí'}
            </Button>
            <a href={docsUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm" icon={<ExternalLink size={14} />}>/docs</Button>
            </a>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} loading={downloadingSpec} onClick={() => void handleDownloadOpenApi()} data-testid="system-download-openapi-btn">
              Descargar /openapi.json
            </Button>
            <a href={openApiUrl} target="_blank" rel="noreferrer" className="sr-only">Ver openapi.json</a>
          </div>
        </div>

        {showScalarFrame ? (
          <iframe src={docsUrl} title="Documentación interactiva Scalar" className={styles.iframeBox} data-testid="scalar-docs-iframe" />
        ) : null}
      </section>
    </div>
  );
};
