import React, { useState } from 'react';
import {
  Server,
  Save,
  RotateCcw,
  Download,
  Image as ImageIcon,
  Table2,
  ArrowLeft,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { storageService, DEFAULT_CONFIG } from '../services/storageService';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { healthService } from '../services/healthService';
import { cleanBaseUrl, buildPublicAssetUrl } from '../utils/formatters';
import { useToast } from '../context/useToast';
import { useAuth } from '../context/useAuth';
import type { MediaCategory, ImageItem, TableItem } from '../types/media';
import type { HealthResponse } from '../types/api';
import styles from './SettingsView.module.css';

export interface SettingsViewProps {
  onBackToGallery: () => void;
  onConfigSaved?: () => void;
  onItemImported?: () => void;
  folderId?: string | null;
  onOpenChangePassword?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBackToGallery,
  onConfigSaved,
  onItemImported,
  folderId,
  onOpenChangePassword,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Inicializar estado directamente desde storageService (cumpliendo con React 19 sin setState en useEffect)
  const [config, setConfig] = useState(() => storageService.getConfig());
  const [baseUrl, setBaseUrl] = useState(() => config.baseUrl);
  const [apiKey, setApiKey] = useState(() => config.apiKey);

  // Estado de prueba de conexión en vivo
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthResponse | null>(null);

  // Estado de importación por shortCode
  const [importCode, setImportCode] = useState('');
  const [importName, setImportName] = useState('');
  const [importCategory, setImportCategory] = useState<MediaCategory>('image');

  // Guardar configuración de API
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      baseUrl: baseUrl.trim() || DEFAULT_CONFIG.baseUrl,
      apiKey: apiKey.trim(),
    };
    storageService.saveConfig(updated);
    setConfig(updated);
    showToast('Configuración guardada exitosamente', 'success');
    onConfigSaved?.();
  };

  // Restablecer a valores por defecto
  const handleResetConfig = () => {
    setBaseUrl(DEFAULT_CONFIG.baseUrl);
    setApiKey(DEFAULT_CONFIG.apiKey);
    showToast('Valores por defecto restablecidos en el formulario', 'info');
  };

  // Probar conectividad con el backend
  const handleTestConnection = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await healthService.checkHealth();
      setHealthResult(res);
      if (res.status === 'ok') {
        showToast(`Conexión exitosa (${res.latencyMs || 0} ms) - DB: ${res.db}`, 'success');
      } else {
        showToast('El servidor respondió pero reporta estado degradado', 'info');
      }
    } catch {
      setHealthResult({
        status: 'degraded',
        db: 'down',
        storage: 'unwritable',
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      });
      showToast('No se pudo conectar con el endpoint /health', 'error');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Importar recurso por shortCode
  const handleImportShortCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = importCode.trim();
    if (!code) {
      showToast('Por favor introduce un shortCode válido', 'error');
      return;
    }

    const currentBase = cleanBaseUrl(baseUrl || config.baseUrl);

    if (importCategory === 'image') {
      const newItem: ImageItem = {
        id: `import-${Date.now()}`,
        shortCode: code,
        originalName: importName.trim() || `imagen-${code}.png`,
        mimeType: 'image/png',
        sizeBytes: 0,
        url: buildPublicAssetUrl(currentBase, 'i', code),
        createdAt: new Date().toISOString(),
        folderId: folderId || null,
      };
      storageService.addImage(newItem);
      showToast(`Imagen '${newItem.originalName}' importada al catálogo`, 'success');
    } else {
      const newItem: TableItem = {
        id: `import-${Date.now()}`,
        shortCode: code,
        tableName: importName.trim() || `tabla-${code}.csv`,
        rowCount: 0,
        sizeBytes: 0,
        url: buildPublicAssetUrl(currentBase, 't', code),
        createdAt: new Date().toISOString(),
        folderId: folderId || null,
      };
      storageService.addTable(newItem);
      showToast(`Dataset '${newItem.tableName}' importado al catálogo`, 'success');
    }

    setImportCode('');
    setImportName('');
    onItemImported?.();
  };

  // Previsualización dinámica de la URL canónica
  const cleanCurrentBase = cleanBaseUrl(baseUrl || config.baseUrl || 'http://localhost:3000');
  const previewPath = importCategory === 'image' ? 'i' : 't';
  const previewShortCode = importCode.trim() || ':shortCode';
  const previewCanonicalUrl = `${cleanCurrentBase}/${previewPath}/${previewShortCode}`;

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleBadgeRow}>
            <h1 className={styles.title}>Configuración & Herramientas API</h1>
            <span className={styles.badgePill}>Dokploy Media Studio</span>
          </div>
          <span className={styles.subtitle}>
            Administra la conectividad con Monolith Backend, endpoints de Dokploy e ingesta directa por ShortCode.
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

      {/* Grid de Formularios de Configuración e Importación */}
      <div className={styles.contentGrid}>
        {/* Panel 1: Configuración de Conexión API */}
        <section className={styles.card} aria-labelledby="api-settings-heading">
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <Server size={20} />
            </div>
            <div className={styles.cardHeaderTexts}>
              <h2 id="api-settings-heading" className={styles.cardTitle}>
                Conexión con Monolith Backend
              </h2>
              <span className={styles.cardSubtitle}>
                Host remoto Dokploy o entorno de desarrollo local.
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="settings-base-url" className={styles.label}>
                URL Base de Monolith Backend
              </label>
              <input
                id="settings-base-url"
                type="text"
                className={styles.input}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:3000"
              />
              <span className={styles.help}>
                Dirección del backend desplegado en Dokploy (ej. dominio .sslip.io) o puerto local 8080.
              </span>
            </div>

            <div className={styles.field}>
              <label htmlFor="settings-api-key" className={styles.label}>
                X-API-Key de Sistema
              </label>
              <input
                id="settings-api-key"
                type="text"
                className={styles.input}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="mk_live_..."
              />
              <span className={styles.help}>
                Llave API maestra de sistema para operaciones directas con el servidor.
              </span>
            </div>

            {/* Test de Conexión en vivo */}
            <div className={styles.testRow}>
              <div className={styles.testStatus}>
                {healthResult ? (
                  healthResult.status === 'ok' ? (
                    <>
                      <span className={`${styles.statusDot} ${styles.statusDotSuccess}`} />
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        En línea ({healthResult.latencyMs} ms) · DB: {healthResult.db}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`${styles.statusDot} ${styles.statusDotDegraded}`} />
                      <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                        Degradado / Sin respuesta
                      </span>
                    </>
                  )
                ) : (
                  <>
                    <Activity size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Diagnóstico listo</span>
                  </>
                )}
              </div>

              <button
                type="button"
                className={styles.testBtn}
                onClick={handleTestConnection}
                disabled={isCheckingHealth}
              >
                <Activity size={13} />
                <span>{isCheckingHealth ? 'Probando...' : 'Probar Conexión'}</span>
              </button>
            </div>

            <div className={styles.actions}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={handleResetConfig}
              >
                Valores por Defecto
              </Button>
              <Button type="submit" variant="primary" icon={<Save size={16} />}>
                Guardar Configuración
              </Button>
            </div>
          </form>
        </section>

        {/* Panel 2: Importar Recurso por ShortCode */}
        <section className={styles.card} aria-labelledby="import-shortcode-heading">
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.cardIconPurple}`}>
              <Download size={20} />
            </div>
            <div className={styles.cardHeaderTexts}>
              <h2 id="import-shortcode-heading" className={styles.cardTitle}>
                Importación por ShortCode
              </h2>
              <span className={styles.cardSubtitle}>
                Registra un recurso existente en el catálogo sin volver a subirlo.
              </span>
            </div>
          </div>

          <form onSubmit={handleImportShortCode} className={styles.form}>
            <div className={styles.field}>
              <span className={styles.label}>Tipo de Recurso</span>
              <div className={styles.typeSelector}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${importCategory === 'image' ? styles.active : ''}`}
                  onClick={() => setImportCategory('image')}
                >
                  <ImageIcon size={16} />
                  <span>Imagen (/i/...)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${importCategory === 'table' ? styles.active : ''}`}
                  onClick={() => setImportCategory('table')}
                >
                  <Table2 size={16} />
                  <span>Tabla / CSV (/t/...)</span>
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="import-shortcode" className={styles.label}>
                ShortCode (Código Corto)
              </label>
              <input
                id="import-shortcode"
                type="text"
                className={styles.input}
                placeholder="ej. 7xK9mP2vQ1"
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
              />
              <span className={styles.help}>
                Identificador único de 10 caracteres generado al subir el archivo al backend.
              </span>
            </div>

            <div className={styles.field}>
              <label htmlFor="import-name" className={styles.label}>
                Nombre personalizado (opcional)
              </label>
              <input
                id="import-name"
                type="text"
                className={`${styles.input} ${styles.inputSans}`}
                placeholder={
                  importCategory === 'image' ? 'ej. diagrama-cluster.png' : 'ej. reporte-metricas.csv'
                }
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
              />
            </div>

            {/* URL Canónica en tiempo real */}
            <div className={styles.previewBox}>
              <span className={styles.previewLabel}>Enlace Canónico Público</span>
              <span className={styles.previewUrl}>{previewCanonicalUrl}</span>
            </div>

            <div className={styles.actions}>
              <Button type="submit" variant="primary" icon={<Download size={16} />}>
                Importar al Catálogo
              </Button>
            </div>
          </form>
        </section>

        {/* Panel 3: Mi Perfil & Seguridad de Sesión */}
        <section className={styles.card} aria-labelledby="user-profile-security-heading">
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.cardIconPurple}`}>
              <ShieldCheck size={20} />
            </div>
            <div className={styles.cardHeaderTexts}>
              <h2 id="user-profile-security-heading" className={styles.cardTitle}>
                Mi Perfil & Seguridad
              </h2>
              <span className={styles.cardSubtitle}>
                Gestión de credenciales y datos de sesión activa en Monolith Backend.
              </span>
            </div>
          </div>

          <div className={styles.form}>
            <div className={styles.previewBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.previewLabel}>Usuario Activo</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {user?.username || 'admin'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '10px',
                }}
              >
                <span className={styles.previewLabel}>Rol de Sistema</span>
                <span className={styles.badgePill}>{user?.role || 'ADMIN'}</span>
              </div>
            </div>

            <div className={styles.actions} style={{ justifyContent: 'flex-start' }}>
              <Button
                type="button"
                variant="primary"
                icon={<KeyRound size={16} />}
                onClick={onOpenChangePassword}
              >
                Cambiar Contraseña
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Info Banner: Arquitectura de Rutas y Endpoints */}
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
