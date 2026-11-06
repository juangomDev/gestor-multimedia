import React, { useState } from 'react';
import { BookOpen, ExternalLink, FileJson, MonitorPlay } from 'lucide-react';
import { healthService } from '../../services/healthService';
import { ScalarDocsModal } from './ScalarDocsModal';
import { OpenApiSpecModal } from './OpenApiSpecModal';
import cardStyles from './SettingsCards.module.css';
import styles from './DiagnosticsCards.module.css';

/**
 * Tarjeta "Documentación Interactiva de la API (Scalar)": enlace a `/docs`,
 * visor integrado en iframe e inspector de la especificación `/openapi.json`.
 */
export const ApiDocsCard: React.FC = () => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const docsUrl = healthService.getDocsUrl();
  const openApiUrl = healthService.getOpenApiUrl();

  return (
    <section className={cardStyles.card} aria-labelledby="api-docs-heading">
      <div className={cardStyles.cardHeader}>
        <div className={cardStyles.cardIcon}>
          <BookOpen size={20} />
        </div>
        <div className={cardStyles.cardHeaderTexts}>
          <h2 id="api-docs-heading" className={cardStyles.cardTitle}>
            Documentación Interactiva de la API (Scalar)
          </h2>
          <span className={cardStyles.cardSubtitle}>
            Explora y prueba los endpoints de Monolith Backend desde su contrato OpenAPI 3.1.
          </span>
        </div>
      </div>

      <div className={cardStyles.form}>
        <div className={cardStyles.previewBox}>
          <span className={cardStyles.previewLabel}>Consola Scalar</span>
          <span className={cardStyles.previewUrl}>{docsUrl}</span>
          <span className={cardStyles.previewLabel} style={{ marginTop: '6px' }}>
            Especificación cruda
          </span>
          <span className={cardStyles.previewUrl}>{openApiUrl}</span>
        </div>

        <div className={styles.buttonRow}>
          <a className={styles.linkBtn} href={docsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} />
            <span>Abrir /docs en nueva pestaña</span>
          </a>
          <button type="button" className={styles.linkBtn} onClick={() => setIsViewerOpen(true)}>
            <MonitorPlay size={14} />
            <span>Visor Integrado</span>
          </button>
          <button type="button" className={styles.linkBtn} onClick={() => setIsSpecOpen(true)}>
            <FileJson size={14} />
            <span>Inspeccionar openapi.json</span>
          </button>
        </div>
      </div>

      <ScalarDocsModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        docsUrl={docsUrl}
      />
      {isSpecOpen && <OpenApiSpecModal onClose={() => setIsSpecOpen(false)} />}
    </section>
  );
};

