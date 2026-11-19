import React from 'react';
import { AlertTriangle, HardDrive, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useStorageStatsQuery } from '../../queries/useAdminQueries';
import { formatBytes } from '../../utils/formatters';
import styles from './AdminShared.module.css';

/**
 * Propiedades del monitor de almacenamiento y cuota (`StorageStatsPanel`).
 */
export interface StorageStatsPanelProps {
  /** Habilita o difiere la consulta (útil en pestañas bajo demanda). */
  enabled?: boolean;
}

/**
 * Monitor de almacenamiento lógico (PostgreSQL), volumen de disco físico (`disk`),
 * top carpetas más pesadas y alerta preventiva cuando `warning: true` (`GET /api/v1/stats/storage`).
 * Reutilizable tanto en `/admin/storage` (`ADMIN`) como en `/team` (`MANAGER`).
 */
export const StorageStatsPanel: React.FC<StorageStatsPanelProps> = ({ enabled = true }) => {
  const statsQuery = useStorageStatsQuery(enabled);
  const stats = statsQuery.data;

  if (statsQuery.isLoading) {
    return <Skeleton variant="card" height={220} />;
  }

  if (statsQuery.isError || !stats) {
    return (
      <EmptyState
        icon={<HardDrive size={22} />}
        title="No se pudieron cargar las métricas de almacenamiento"
        description="Verifica la conectividad con /api/v1/stats/storage."
      />
    );
  }

  const db = stats.database;
  const disk = stats.disk;
  const topFolders = stats.topFolders ?? [];
  const maxFolderBytes = Math.max(...topFolders.map((f) => f.totalBytes ?? 0), 1);

  return (
    <div className={styles.panel} data-testid="storage-stats-panel">
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.sectionTitle}>
            {stats.isAdmin ? 'Almacenamiento global y disco físico' : 'Cuota de tu espacio y equipo'}
          </h2>
          <p className={styles.sectionDesc}>
            Desglose en tiempo real desde PostgreSQL y volumen persistente del servidor.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} />}
          loading={statsQuery.isFetching}
          onClick={() => void statsQuery.refetch()}
        >
          Actualizar
        </Button>
      </div>

      {stats.warning ? (
        <div className={styles.warnAlert} role="alert" data-testid="storage-warning-banner">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Alerta preventiva de almacenamiento:</strong>{' '}
            {stats.warningMessage ||
              'El volumen físico de almacenamiento se encuentra cerca de su umbral de capacidad.'}
          </div>
        </div>
      ) : null}

      <div className={styles.cardGrid}>
        <div className={`${styles.metricCard} ${styles.spineAccent}`}>
          <span className={styles.metricLabel}>Total en base de datos</span>
          <span className={styles.metricValue}>{formatBytes(db.totalSizeBytes ?? 0)}</span>
          <span className={styles.metricSub}>{db.totalCount ?? 0} activos indexados</span>
        </div>

        <div className={`${styles.metricCard} ${styles.spineImage}`}>
          <span className={styles.metricLabel}>Imágenes</span>
          <span className={styles.metricValue}>{formatBytes(db.images?.sizeBytes ?? 0)}</span>
          <span className={styles.metricSub}>{db.images?.count ?? 0} archivos</span>
        </div>

        <div className={`${styles.metricCard} ${styles.spineTable}`}>
          <span className={styles.metricLabel}>Tablas</span>
          <span className={styles.metricValue}>{formatBytes(db.tables?.sizeBytes ?? 0)}</span>
          <span className={styles.metricSub}>{db.tables?.count ?? 0} datasets</span>
        </div>

        <div className={`${styles.metricCard} ${styles.spinePdf}`}>
          <span className={styles.metricLabel}>Documentos PDF</span>
          <span className={styles.metricValue}>{formatBytes(db.pdfs?.sizeBytes ?? 0)}</span>
          <span className={styles.metricSub}>{db.pdfs?.count ?? 0} documentos</span>
        </div>
      </div>

      {disk ? (
        <section className={styles.sectionCard} data-testid="storage-disk-section">
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Salud del disco físico (`./storage`)</h3>
            <Badge tone={stats.warning ? 'warn' : 'ok'} mono>
              {formatBytes(disk.totalBytes ?? 0)} · {disk.totalFilesCount ?? 0} ficheros
            </Badge>
          </div>
          <div className={styles.cardGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Disco · Imágenes</span>
              <span className={styles.metricValue}>{formatBytes(disk.imagesBytes ?? 0)}</span>
              <span className={styles.metricSub}>{disk.imagesFilesCount ?? 0} archivos físicos</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Disco · Tablas</span>
              <span className={styles.metricValue}>{formatBytes(disk.tablesBytes ?? 0)}</span>
              <span className={styles.metricSub}>{disk.tablesFilesCount ?? 0} archivos físicos</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Disco · PDFs</span>
              <span className={styles.metricValue}>{formatBytes(disk.pdfsBytes ?? 0)}</span>
              <span className={styles.metricSub}>{disk.pdfsFilesCount ?? 0} archivos físicos</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>Carpetas con mayor ocupación</h3>
        {topFolders.length === 0 ? (
          <p className={styles.sectionDesc}>Aún no hay carpetas con archivos registrados.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table} data-testid="top-folders-table">
              <thead>
                <tr>
                  <th>Carpeta</th>
                  <th>Tipo</th>
                  <th>Archivos</th>
                  <th>Peso</th>
                  <th>Proporción</th>
                </tr>
              </thead>
              <tbody>
                {topFolders.map((folder, idx) => {
                  const bytes = folder.totalBytes ?? 0;
                  const pct = Math.max(4, Math.round((bytes / maxFolderBytes) * 100));
                  return (
                    <tr key={folder.id || `top-${idx}`} className={styles.row}>
                      <td className={styles.monoPrimary}>{folder.name || 'Sin nombre'}</td>
                      <td>
                        <Badge mono>{(folder.type || 'folder').toUpperCase()}</Badge>
                      </td>
                      <td className={styles.mono}>{folder.itemsCount ?? 0}</td>
                      <td className={styles.monoPrimary}>{formatBytes(bytes)}</td>
                      <td>
                        <div className={styles.barTrack} aria-hidden="true">
                          <div className={styles.barFill} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
