import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, RefreshCw, ScrollText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuditLogsQuery } from '../../queries/useAdminQueries';
import { formatDate } from '../../utils/formatters';
import type { AuditLogItem } from '../../services/auditService';
import styles from './AdminShared.module.css';

/**
 * Propiedades del panel de auditoría cronológica (`AuditLogsPanel`).
 */
export interface AuditLogsPanelProps {
  /** Habilita o difiere la consulta (útil en pestañas inactivas). */
  enabled?: boolean;
  /** Límite de registros por página (por defecto `25`). */
  pageSize?: number;
}

const ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'CREATE_USER', label: 'CREATE_USER' },
  { value: 'UPDATE_USER_STATUS', label: 'UPDATE_USER_STATUS' },
  { value: 'RESET_PASSWORD', label: 'RESET_PASSWORD' },
  { value: 'DELETE_USER', label: 'DELETE_USER' },
  { value: 'CREATE_FOLDER', label: 'CREATE_FOLDER' },
  { value: 'SHARE_FOLDER', label: 'SHARE_FOLDER' },
  { value: 'DELETE_FOLDER', label: 'DELETE_FOLDER' },
  { value: 'UPLOAD_IMAGE', label: 'UPLOAD_IMAGE' },
  { value: 'UPLOAD_TABLE', label: 'UPLOAD_TABLE' },
  { value: 'UPLOAD_PDF', label: 'UPLOAD_PDF' },
  { value: 'CREATE_API_KEY', label: 'CREATE_API_KEY' },
  { value: 'REVOKE_API_KEY', label: 'REVOKE_API_KEY' },
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'Todos los recursos' },
  { value: 'USER', label: 'Usuario (USER)' },
  { value: 'FOLDER', label: 'Carpeta (FOLDER)' },
  { value: 'IMAGE', label: 'Imagen (IMAGE)' },
  { value: 'TABLE', label: 'Tabla (TABLE)' },
  { value: 'PDF', label: 'PDF (PDF)' },
  { value: 'FORM', label: 'Formulario (FORM)' },
  { value: 'API_KEY', label: 'API Key (API_KEY)' },
];

/**
 * Historial cronológico inmutable de auditoría (`GET /api/v1/audit-logs`) con filtros por acción
 * y tipo de recurso, paginación server-side e inspección modal de metadatos JSON.
 * Reutilizable tanto en `/admin/audit` (`ADMIN`) como en `/team` (`MANAGER`).
 */
export const AuditLogsPanel: React.FC<AuditLogsPanelProps> = ({
  enabled = true,
  pageSize = 25,
}) => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const logsQuery = useAuditLogsQuery(
    {
      page,
      limit: pageSize,
      action: action || undefined,
      resourceType: resourceType || undefined,
    },
    enabled
  );

  const logs = logsQuery.data?.logs ?? [];
  const total = logsQuery.data?.total ?? 0;
  const totalPages = logsQuery.data?.totalPages ?? 1;

  return (
    <div className={styles.panel} data-testid="audit-logs-panel">
      <div className={styles.toolbar}>
        <div className={styles.filterCluster}>
          <select
            aria-label="Filtrar auditoría por acción"
            className={styles.select}
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            data-testid="audit-action-filter"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value || 'all-act'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar auditoría por recurso"
            className={styles.select}
            value={resourceType}
            onChange={(e) => {
              setResourceType(e.target.value);
              setPage(1);
            }}
            data-testid="audit-resource-filter"
          >
            {RESOURCE_OPTIONS.map((opt) => (
              <option key={opt.value || 'all-res'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} />}
          loading={logsQuery.isFetching}
          onClick={() => void logsQuery.refetch()}
        >
          Actualizar
        </Button>
      </div>

      {logsQuery.isLoading ? (
        <Skeleton variant="card" height={220} />
      ) : logsQuery.isError ? (
        <EmptyState
          icon={<ScrollText size={22} />}
          title="No se pudo cargar el registro de auditoría"
          description="Verifica tu sesión y permisos para consultar /api/v1/audit-logs."
        />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={22} />}
          title="Sin eventos de auditoría"
          description="No existen registros que coincidan con los filtros seleccionados."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} data-testid="audit-logs-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Actor</th>
                <th>Acción</th>
                <th>Recurso</th>
                <th>IP</th>
                <th aria-label="Detalle" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className={styles.row}>
                  <td className={styles.mono}>{formatDate(log.createdAt)}</td>
                  <td className={styles.monoPrimary}>{log.actorUsername}</td>
                  <td>
                    <Badge
                      tone={
                        log.action.includes('DELETE') || log.action.includes('REVOKE')
                          ? 'danger'
                          : log.action.includes('CREATE') || log.action.includes('UPLOAD')
                          ? 'ok'
                          : 'neutral'
                      }
                      mono
                    >
                      {log.action}
                    </Badge>
                  </td>
                  <td className={styles.mono}>
                    {log.resourceType}
                    {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}` : ''}
                  </td>
                  <td className={styles.mono}>{log.ipAddress || '—'}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye size={13} />}
                      onClick={() => setSelectedLog(log)}
                      aria-label={`Ver detalle del evento ${log.id}`}
                    >
                      Detalle
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.paginationBar} data-testid="audit-pagination">
            <span>
              {total} eventos · Página {page} de {Math.max(1, totalPages)}
            </span>
            <div className={styles.paginationBtns}>
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronLeft size={14} />}
                disabled={page <= 1 || logsQuery.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                iconRight={<ChevronRight size={14} />}
                disabled={page >= totalPages || logsQuery.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
        title={selectedLog ? `Evento · ${selectedLog.action}` : 'Detalle de evento'}
        description={
          selectedLog
            ? `${selectedLog.actorUsername} · ${formatDate(selectedLog.createdAt)}`
            : undefined
        }
        size="md"
      >
        {selectedLog ? (
          <pre className={styles.codePre}>
            <code>
              {JSON.stringify(
                {
                  id: selectedLog.id,
                  actorUsername: selectedLog.actorUsername,
                  action: selectedLog.action,
                  resourceType: selectedLog.resourceType,
                  resourceId: selectedLog.resourceId,
                  folderId: selectedLog.folderId,
                  ipAddress: selectedLog.ipAddress,
                  metadata: selectedLog.metadata ?? null,
                },
                null,
                2
              )}
            </code>
          </pre>
        ) : null}
      </Dialog>
    </div>
  );
};
