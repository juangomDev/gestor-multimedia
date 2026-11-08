import React, { useState, useEffect, useCallback } from 'react';
import { HardDrive, RefreshCw, Database, Folder, PieChart } from 'lucide-react';
import { Button } from '../common/Button';
import {
  storageStatsService,
  type StorageStatsResponse,
  type FolderStorageStats,
} from '../../services/storageStatsService';
import { useToast } from '../../context/useToast';
import { formatBytes } from '../../utils/formatters';
import styles from './SettingsCards.module.css';

/**
 * Tarjeta de telemetría y monitor de almacenamiento en disco y PostgreSQL.
 * Presenta desgloses de uso por tipo de medio y las carpetas más pesadas.
 */
export const StorageMonitorCard: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState<StorageStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Obtiene las estadísticas de consumo desde el backend.
   */
  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await storageStatsService.fetchStorageStats();
      setStats(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener telemetría de almacenamiento';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    storageStatsService
      .fetchStorageStats()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Error al obtener telemetría de almacenamiento';
          showToast(msg, 'error');
        }
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const dbTotal = formatBytes(stats?.database?.totalSizeBytes || 0);
  const dbImages = formatBytes(stats?.database?.images?.sizeBytes || 0);
  const dbTables = formatBytes(stats?.database?.tables?.sizeBytes || 0);

  return (
    <div className={styles.card} data-testid="storage-monitor-card">
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>
          <HardDrive size={20} />
        </div>
        <div className={styles.cardHeaderTexts} style={{ flex: 1 }}>
          <h2 className={styles.cardTitle}>Monitor de Almacenamiento & Cuotas</h2>
          <span className={styles.cardSubtitle}>
            Métricas de ocupación física en disco, bases de datos PostgreSQL y carpetas principales.
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void loadStats()}
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </Button>
      </div>

      {isLoading && !stats ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando telemetría de almacenamiento...
        </div>
      ) : !stats ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No fue posible cargar las estadísticas de almacenamiento.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Métricas de BD y Disco */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Tarjeta BD */}
            <div
              style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
                <Database size={16} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Almacenamiento Total BD</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {dbTotal}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Imágenes: {dbImages}</span>
                <span>Tablas: {dbTables}</span>
              </div>
            </div>

            {/* Tarjeta Disco (si está disponible) */}
            {stats.disk && (
              <div
                style={{
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-purple)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PieChart size={16} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Disco Físico</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                    {formatBytes(stats.disk.totalBytes || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Imágenes: {formatBytes(stats.disk.imagesBytes || 0)}</span>
                  <span>Tablas: {formatBytes(stats.disk.tablesBytes || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Top Carpetas */}
          {stats.topFolders && stats.topFolders.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Carpetas con Mayor Consumo
              </span>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.8125rem',
                    color: 'var(--text-main)',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px' }}>Carpeta</th>
                      <th style={{ padding: '8px' }}>Tipo</th>
                      <th style={{ padding: '8px' }}>Elementos</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Espacio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topFolders.map((f: FolderStorageStats, idx: number) => (
                      <tr key={f.id ?? `root-${idx}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px', fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Folder size={14} style={{ color: 'var(--accent-primary)' }} />
                            {f.name || 'Sin nombre'}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              background: f.type === 'image' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: f.type === 'image' ? 'var(--accent-primary)' : 'var(--color-success)',
                            }}
                          >
                            {f.type === 'image' ? 'Imágenes' : 'Tablas'}
                          </span>
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{f.itemsCount || 0}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                          {formatBytes(f.totalBytes || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
