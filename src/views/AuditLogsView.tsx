import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RefreshCw, Eye, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { auditService, type AuditLogItem } from '../services/auditService';
import { AuditDetailModal } from '../components/audit/AuditDetailModal';
import { Button } from '../components/common/Button';
import styles from './AuditLogsView.module.css';

/**
 * Propiedades del orquestador de la vista de Auditoría y Trazabilidad.
 */
export interface AuditLogsViewProps {
  onBackToGallery?: () => void;
}

/**
 * Vista para consultar el registro de auditoría (`GET /api/v1/audit-logs`)
 * con filtros interactivos por tipo de acción, tipo de recurso y paginación.
 */
export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ onBackToGallery }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await auditService.fetchAuditLogs({
        page,
        limit: 25,
        action: actionFilter || undefined,
        resourceType: resourceFilter || undefined,
      });
      setLogs(res.logs ?? (res as unknown as { items?: AuditLogItem[] })?.items ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (err) {
      console.warn('Error al cargar historial de auditoría:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, resourceFilter]);

  useEffect(() => {
    let active = true;
    auditService
      .fetchAuditLogs({
        page,
        limit: 25,
        action: actionFilter || undefined,
        resourceType: resourceFilter || undefined,
      })
      .then((res) => {
        if (!active) return;
        setLogs(res.logs ?? (res as unknown as { items?: AuditLogItem[] })?.items ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
      })
      .catch((err) => {
        if (active) console.warn('Error al cargar historial de auditoría:', err);
      });
    return () => {
      active = false;
    };
  }, [page, actionFilter, resourceFilter]);

  const getActionBadgeClass = (action: string) => {
    if (action.includes('CREATE') || action.includes('UPLOAD')) return styles.badgeCreate;
    if (action.includes('DELETE') || action.includes('REVOKE')) return styles.badgeDelete;
    if (action.includes('HOTSWAP') || action.includes('RENAME') || action.includes('MOVE') || action.includes('UPDATE')) {
      return styles.badgeUpdate;
    }
    return styles.badgeAction;
  };

  return (
    <div className={styles.container} data-testid="audit-logs-view">
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onBackToGallery && (
              <button
                type="button"
                onClick={onBackToGallery}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Volver"
                aria-label="Volver"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h1 className={styles.title}>Historial de Auditoría & Trazabilidad</h1>
          </div>
          <span className={styles.subtitle}>
            Registro cronológico inmutable de acciones críticas ejecutadas en el sistema ({total} eventos).
          </span>
        </div>

        <div className={styles.controlsRow}>
          <select
            className={styles.select}
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por acción"
          >
            <option value="">Todas las acciones</option>
            <option value="IMAGE_UPLOAD">IMAGE_UPLOAD</option>
            <option value="IMAGE_DELETE">IMAGE_DELETE</option>
            <option value="IMAGE_HOTSWAP">IMAGE_HOTSWAP</option>
            <option value="IMAGE_RENAME">IMAGE_RENAME</option>
            <option value="IMAGE_BULK_DELETE">IMAGE_BULK_DELETE</option>
            <option value="IMAGE_BULK_MOVE">IMAGE_BULK_MOVE</option>
            <option value="TABLE_UPLOAD">TABLE_UPLOAD</option>
            <option value="TABLE_DELETE">TABLE_DELETE</option>
            <option value="TABLE_HOTSWAP">TABLE_HOTSWAP</option>
            <option value="TABLE_RENAME">TABLE_RENAME</option>
            <option value="TABLE_BULK_DELETE">TABLE_BULK_DELETE</option>
            <option value="TABLE_BULK_MOVE">TABLE_BULK_MOVE</option>
            <option value="FOLDER_SHARE">FOLDER_SHARE</option>
            <option value="FOLDER_REVOKE">FOLDER_REVOKE</option>
            <option value="USER_CREATE">USER_CREATE</option>
            <option value="USER_ROLE_CHANGE">USER_ROLE_CHANGE</option>
          </select>

          <select
            className={styles.select}
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por tipo de recurso"
          >
            <option value="">Todos los recursos</option>
            <option value="IMAGE">IMAGE</option>
            <option value="TABLE">TABLE</option>
            <option value="FOLDER">FOLDER</option>
            <option value="USER">USER</option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
            onClick={() => void loadLogs()}
            disabled={isLoading}
          >
            Actualizar
          </Button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Actor</th>
              <th>Acción</th>
              <th>Tipo de Recurso</th>
              <th>ID Recurso</th>
              <th>IP Origen</th>
              <th style={{ textAlign: 'right' }}>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className={styles.emptyState}>
                    <ShieldAlert size={36} />
                    <strong>No se registraron eventos con los filtros aplicados</strong>
                    <span>Prueba modificando los filtros de acción o recurso.</span>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                    {new Date(log.createdAt).toLocaleString('es-ES')}
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.actorUsername}</td>
                  <td>
                    <span className={`${styles.badgeAction} ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.resourceType}</td>
                  <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {log.resourceId ? log.resourceId.slice(0, 8) + '...' : '-'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem' }}>
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye size={14} />}
                      onClick={() => setSelectedLog(log)}
                      title="Ver metadatos completos"
                      aria-label={`Ver detalles de ${log.action}`}
                    >
                      Detalle
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronLeft size={14} />}
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronRight size={14} />}
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      )}

      <AuditDetailModal
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
};

