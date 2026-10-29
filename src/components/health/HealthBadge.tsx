import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { healthService } from '../../services/healthService';
import type { HealthResponse } from '../../types/api';
import styles from './HealthBadge.module.css';

interface HealthBadgeProps {
  onStatusChange?: (status: HealthResponse) => void;
  size?: 'sm' | 'md';
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ onStatusChange, size = 'md' }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checking, setChecking] = useState<boolean>(false);

  const check = async () => {
    setChecking(true);
    try {
      const res = await healthService.checkHealth();
      setHealth(res);
      onStatusChange?.(res);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const isOk = health?.status === 'ok';
  const isDegraded = health?.status === 'degraded' && health.db === 'up';
  const statusClass = isOk ? styles.ok : isDegraded ? styles.degraded : styles.down;
  const dotClass = isOk ? styles.dotOk : isDegraded ? styles.dotDegraded : styles.dotDown;

  const label = checking
    ? 'Verificando...'
    : isOk
    ? `API Online (${health?.latencyMs ?? 0}ms)`
    : isDegraded
    ? 'Backend Degradado'
    : 'Backend Offline';

  return (
    <div
      className={`${styles.badge} ${statusClass} ${size === 'sm' ? styles.badgeSm : ''}`}
      onClick={check}
      title={`Postgres: ${health?.db || 'desconocido'} | Storage: ${health?.storage || 'desconocido'} (Clic para reintentar)`}
      role="status"
    >
      <span className={`${styles.dot} ${dotClass} ${size === 'sm' ? styles.dotSm : ''}`} />
      <span>{label}</span>
      <RefreshCw size={size === 'sm' ? 10 : 12} className={checking ? 'animate-spin' : ''} />
    </div>
  );
};
