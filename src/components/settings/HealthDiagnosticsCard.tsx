import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Database, HardDrive, RefreshCw, Timer, Zap } from 'lucide-react';
import { healthService } from '../../services/healthService';
import type { HealthResponse } from '../../types/api';
import { formatUptime } from '../../utils/formatters';
import cardStyles from './SettingsCards.module.css';
import styles from './DiagnosticsCards.module.css';

/** Intervalo de refresco automático del diagnóstico (ms). */
const DIAGNOSTICS_REFRESH_MS = 30000;

/**
 * Clasifica la latencia en una clase visual de badge.
 * @param ms Latencia medida en milisegundos.
 * @returns Clase CSS del badge correspondiente.
 */
function latencyClass(ms: number): string {
  if (ms <= 0) return styles.badgeDown;
  if (ms < 200) return styles.badgeOk;
  if (ms < 800) return styles.badgeWarn;
  return styles.badgeDown;
}

/**
 * Panel de diagnóstico en tiempo real: estado de PostgreSQL, Storage, latencia y uptime
 * obtenidos de `GET /health`, con refresco automático cada 30 s y manual bajo demanda.
 */
export const HealthDiagnosticsCard: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /** Consulta `GET /health` y guarda el resultado (sin setState síncrono). */
  const loadHealth = useCallback(
    () =>
      healthService.checkHealth().then((res) => {
        setHealth(res);
        setIsRefreshing(false);
      }),
    []
  );

  useEffect(() => {
    void loadHealth();
    const timer = window.setInterval(() => void loadHealth(), DIAGNOSTICS_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadHealth]);

  /** Refresco manual disparado por el usuario. */
  const refresh = () => {
    setIsRefreshing(true);
    void loadHealth();
  };

  const dbUp = health?.db === 'up';
  const storageUp = health?.storage === 'writable';
  const latency = health?.latencyMs ?? 0;

  return (
    <section className={cardStyles.card} aria-labelledby="health-diagnostics-heading">
      <div className={cardStyles.cardHeader}>
        <div className={`${cardStyles.cardIcon} ${cardStyles.cardIconPurple}`}>
          <Activity size={20} />
        </div>
        <div className={cardStyles.cardHeaderTexts}>
          <h2 id="health-diagnostics-heading" className={cardStyles.cardTitle}>
            Diagnóstico de Salud en Tiempo Real
          </h2>
          <span className={cardStyles.cardSubtitle}>
            Estado de servicios reportado por GET /health (refresco automático cada 30 s).
          </span>
        </div>
      </div>

      <div className={styles.diagGrid}>
        <div className={styles.diagTile} data-testid="diag-database">
          <span className={styles.diagTileHeader}>
            <Database size={14} /> PostgreSQL
          </span>
          <span className={`${styles.badge} ${health ? (dbUp ? styles.badgeOk : styles.badgeDown) : styles.badgeWarn}`}>
            {health ? (dbUp ? 'Conectado' : 'Caído') : 'Comprobando'}
          </span>
        </div>

        <div className={styles.diagTile} data-testid="diag-storage">
          <span className={styles.diagTileHeader}>
            <HardDrive size={14} /> Storage
          </span>
          <span className={`${styles.badge} ${health ? (storageUp ? styles.badgeOk : styles.badgeDown) : styles.badgeWarn}`}>
            {health ? (storageUp ? 'Escribible' : 'Sin escritura') : 'Comprobando'}
          </span>
        </div>

        <div className={styles.diagTile} data-testid="diag-latency">
          <span className={styles.diagTileHeader}>
            <Zap size={14} /> Latencia
          </span>
          <span className={`${styles.badge} ${latencyClass(latency)}`}>
            {health && latency > 0 ? `${latency} ms` : 'Sin respuesta'}
          </span>
        </div>

        <div className={styles.diagTile} data-testid="diag-uptime">
          <span className={styles.diagTileHeader}>
            <Timer size={14} /> Uptime
          </span>
          <span className={styles.diagValue}>
            {typeof health?.uptime === 'number' ? formatUptime(health.uptime) : 'No reportado'}
          </span>
        </div>
      </div>

      <div className={styles.footerRow}>
        <span>
          {health
            ? `Estado global: ${health.status === 'ok' ? 'Óptimo' : 'Degradado'} · ${new Date(health.timestamp).toLocaleTimeString('es-ES')}`
            : 'Consultando backend…'}
        </span>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={refresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={14} />
          <span>Actualizar Diagnóstico</span>
        </button>
      </div>
    </section>
  );
};
