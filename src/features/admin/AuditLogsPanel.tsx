import React, { useDeferredValue, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, ScrollText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/useToast';
import { useAuditLogsQuery } from '../../queries/useAdminQueries';
import {
  auditService,
  type AuditLogFilterOptions,
  type AuditLogItem,
} from '../../services/auditService';
import { triggerBlobDownload } from '../../utils/download';
import { formatDate } from '../../utils/formatters';
import { AuditLogsToolbar } from './AuditLogsToolbar';
import styles from './AdminShared.module.css';

/**
 * Propiedades del panel de auditoría cronológica (`AuditLogsPanel`).
 */
export interface AuditLogsPanelProps {
  /** Habilita o difiere la consulta (útil en pestañas inactivas). */
  enabled?: boolean;
  /** Límite de registros por página (por defecto `25`). */
  pageSize?: number;
  /** Oculta filtros exclusivos de `ADMIN` (ej. `API_KEY`) cuando lo usa un `MANAGER`. */
  hideAdminFilters?: boolean;
}

/**
 * Historial cronológico inmutable de auditoría (`GET /api/v1/audit-logs`) con filtros server-side
 * por búsqueda libre, acción, recurso y rango de fechas, exportación CSV/XLSX (`/export`),
 * paginación server-side e inspección modal de metadatos JSON.
 */
export const AuditLogsPanel: React.FC<AuditLogsPanelProps> = ({
  enabled = true,
  pageSize = 25,
  hideAdminFilters = false,
}) => {
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const activeFilters = useMemo<AuditLogFilterOptions>(
    () => ({
      action: action || undefined,
      resourceType: resourceType || undefined,
      search: deferredSearch.trim() || undefined,
      from: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
      to: toDate ? `${toDate}T23:59:59.999Z` : undefined,
    }),
    [action, resourceType, deferredSearch, fromDate, toDate]
  );

  const logsQuery = useAuditLogsQuery({ page, limit: pageSize, ...activeFilters }, enabled);

  const logs = logsQuery.data?.logs ?? [];
  const total = logsQuery.data?.total ?? 0;
  const totalPages = logsQuery.data?.totalPages ?? 1;

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExportingFormat(format);
    try {
      const result = await auditService.downloadExport(format, activeFilters);
      triggerBlobDownload(result.blob, result.filename);
      showToast(`Exportación ${format.toUpperCase()} de auditoría descargada.`, 'success');
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || `No se pudo exportar la auditoría en .${format}.`, 'error');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setAction('');
    setResourceType('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <div className={styles.panel} data-testid="audit-logs-panel">
      <AuditLogsToolbar
        search={search}
        action={action}
        resourceType={resourceType}
        fromDate={fromDate}
        toDate={toDate}
        hideAdminFilters={hideAdminFilters}
        isFetching={logsQuery.isFetching}
        exportingFormat={exportingFormat}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        onActionChange={(val) => {
          setAction(val);
          setPage(1);
        }}
        onResourceTypeChange={(val) => {
          setResourceType(val);
          setPage(1);
        }}
        onFromDateChange={(val) => {
          setFromDate(val);
          setPage(1);
        }}
        onToDateChange={(val) => {
          setToDate(val);
          setPage(1);
        }}
        onClearFilters={handleClearFilters}
        onExport={(fmt) => void handleExport(fmt)}
        onRefresh={() => void logsQuery.refetch()}
      />

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
