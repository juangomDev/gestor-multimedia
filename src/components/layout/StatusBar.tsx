import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { healthService } from '../../services/healthService';
import { formatBytes } from '../../utils/formatters';
import type { HealthResponse } from '../../types/api';
import styles from './StatusBar.module.css';

export interface StatusBarProps {
  totalBytes: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ totalBytes }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await healthService.checkHealth();
      setHealth(res);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    healthService.checkHealth().then((res) => {
      if (isMounted) setHealth(res);
    });
    const interval = setInterval(() => {
      void check();
    }, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [check]);

  const isOk = health?.status === 'ok';
  const isDegraded = health?.status === 'degraded' && health.db === 'up';

  const dotClass = isOk ? styles.dotOk : isDegraded ? styles.dotDegraded : styles.dotDown;
  const healthLabel = checking
    ? 'Verificando...'
    : isOk
    ? `API Online (${health?.latencyMs ?? 0}ms)`
    : isDegraded
    ? 'Backend Degradado'
    : 'Backend Offline';

  return (
    <footer className={styles.statusBar} role="status" aria-label="Estado del sistema">
      <div className={styles.statusItems}>
        <button
          type="button"
          className={styles.statusBtn}
          onClick={check}
          title={`PostgreSQL: ${health?.db || 'desconocido'} | Storage: ${health?.storage || 'desconocido'} (Clic para refrescar)`}
        >
          <span className={`${styles.dot} ${dotClass}`} />
          <span>{healthLabel}</span>
          <RefreshCw size={10} className={checking ? 'animate-spin' : ''} />
        </button>

        <span className={styles.separator}>•</span>

        <span className={styles.storageText} title="Almacenamiento utilizado">
          Almacenamiento: <strong className={styles.storageBold}>{formatBytes(totalBytes)}</strong> / 50 GB
        </span>

        <span className={styles.separator}>•</span>

        <span className={styles.versionText}>Versión v0.30.10</span>
      </div>
    </footer>
  );
};
