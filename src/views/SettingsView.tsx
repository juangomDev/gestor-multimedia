import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { ApiConnectionCard } from '../components/settings/ApiConnectionCard';
import { ShortCodeImportCard } from '../components/settings/ShortCodeImportCard';
import { ProfileSecurityCard } from '../components/settings/ProfileSecurityCard';
import styles from './SettingsView.module.css';

/**
 * Propiedades de la vista de configuración y herramientas de la API.
 */
export interface SettingsViewProps {
  onBackToGallery: () => void;
  onConfigSaved?: () => void;
  onItemImported?: () => void;
  folderId?: string | null;
  onOpenChangePassword?: () => void;
}

/**
 * Vista orquestadora de configuración de API, ingesta por ShortCode y seguridad de sesión.
 */
export const SettingsView: React.FC<SettingsViewProps> = ({
  onBackToGallery,
  onConfigSaved,
  onItemImported,
  folderId,
  onOpenChangePassword,
}) => {
  const [initialConfig] = useState(() => storageService.getConfig());
  const [baseUrl, setBaseUrl] = useState(() => initialConfig.baseUrl);
  const [apiKey, setApiKey] = useState(() => initialConfig.apiKey);

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleBadgeRow}>
            <h1 className={styles.title}>Configuración & Herramientas API</h1>
            <span className={styles.badgePill}>Dokploy Media Studio</span>
          </div>
          <span className={styles.subtitle}>
            Administra la conectividad con Monolith Backend, endpoints de Dokploy e ingesta directa
            por ShortCode.
          </span>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBackToGallery}
            title="Volver a la galería principal"
          >
            <ArrowLeft size={16} />
            <span>Volver a Galería</span>
          </button>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <ApiConnectionCard
          baseUrl={baseUrl}
          apiKey={apiKey}
          onBaseUrlChange={setBaseUrl}
          onApiKeyChange={setApiKey}
          onConfigSaved={onConfigSaved}
        />

        <ShortCodeImportCard
          baseUrl={baseUrl}
          folderId={folderId}
          onItemImported={onItemImported}
        />

        <ProfileSecurityCard onOpenChangePassword={onOpenChangePassword} />
      </div>

      <section className={styles.infoBanner} aria-label="Información de Endpoints">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Endpoints Públicos Canónicos
          </span>
        </div>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Imágenes (Direct Stream)</span>
            <span className={styles.infoValue}>GET /i/:short_code</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Tablas (Paginación JSON)</span>
            <span className={styles.infoValue}>GET /t/:short_code?page=1&limit=50</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Tablas (Descarga Original)</span>
            <span className={styles.infoValue}>GET /t/:short_code?download=true</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Diagnóstico de Salud</span>
            <span className={styles.infoValue}>GET /health</span>
          </div>
        </div>
      </section>
    </div>
  );
};
