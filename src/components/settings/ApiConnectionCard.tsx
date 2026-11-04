import React, { useState } from 'react';
import { Server, Save, RotateCcw, Activity } from 'lucide-react';
import { Button } from '../common/Button';
import { storageService, DEFAULT_CONFIG } from '../../services/storageService';
import { healthService } from '../../services/healthService';
import { useToast } from '../../context/useToast';
import type { HealthResponse } from '../../types/api';
import styles from './SettingsCards.module.css';

/**
 * Propiedades para la tarjeta de configuración de conexión con Monolith Backend.
 */
export interface ApiConnectionCardProps {
  baseUrl: string;
  apiKey: string;
  onBaseUrlChange: (url: string) => void;
  onApiKeyChange: (key: string) => void;
  onConfigSaved?: () => void;
}

/**
 * Tarjeta de formulario para configurar la URL base, la llave `X-API-Key` y probar la salud del backend.
 */
export const ApiConnectionCard: React.FC<ApiConnectionCardProps> = ({
  baseUrl,
  apiKey,
  onBaseUrlChange,
  onApiKeyChange,
  onConfigSaved,
}) => {
  const { showToast } = useToast();
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthResponse | null>(null);

  /**
   * Persiste la configuración actual en localStorage y notifica a la vista padre.
   */
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      baseUrl: baseUrl.trim() || DEFAULT_CONFIG.baseUrl,
      apiKey: apiKey.trim(),
    };
    storageService.saveConfig(updated);
    showToast('Configuración guardada exitosamente', 'success');
    onConfigSaved?.();
  };

  /**
   * Restaura los valores por defecto en el formulario de conectividad.
   */
  const handleResetConfig = () => {
    onBaseUrlChange(DEFAULT_CONFIG.baseUrl);
    onApiKeyChange(DEFAULT_CONFIG.apiKey);
    showToast('Valores por defecto restablecidos en el formulario', 'info');
  };

  /**
   * Ejecuta una prueba diagnóstica contra `GET /health` midiendo latencia y estado de PostgreSQL.
   */
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

  return (
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
            onChange={(e) => onBaseUrlChange(e.target.value)}
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
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="mk_live_..."
          />
          <span className={styles.help}>
            Llave API maestra de sistema para operaciones directas con el servidor.
          </span>
        </div>

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
  );
};

