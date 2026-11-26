import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ClipboardCheck, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/useToast';
import {
  useDispatchFormEntryMutation,
  useFormDetailQuery,
  useFormEntriesQuery,
} from '../../queries/useFormsQueries';
import { formsService } from '../../services/formsService';
import { useFolderWriteAccess } from '../explorer/useFolderWriteAccess';
import { FormInboxHeader } from './FormInboxHeader';
import { FormEmbedDialog } from './FormEmbedDialog';
import { EditFormDialog } from './EditFormDialog';
import { DeleteFormDialog } from './DeleteFormDialog';
import { ResolveEntryDialog } from './ResolveEntryDialog';
import { FormEntriesTable } from './FormEntriesTable';
import { countEntryStatuses, triggerBlobDownload } from './formHelpers';
import type { FormEntry, FormEntryStatus } from '../../types/forms';
import styles from './FormInboxPage.module.css';

type StatusFilter = FormEntryStatus | 'ALL';

const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'NEW', label: 'Pendientes (NEW)' },
  { value: 'VALID', label: 'Válidas (VALID)' },
  { value: 'INVALID', label: 'Inválidas (INVALID)' },
];

/**
 * Bandeja mensual, gestión (`PATCH`/`DELETE /api/v1/forms/:id`) y resolución **Write-Once**
 * de Formularios Dinámicos (`/folder/:folderId/forms/:formId`), cargada con `React.lazy`.
 */
export const FormInboxPage: React.FC = () => {
  const { folderId, formId = '' } = useParams<{ folderId: string; formId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [trackedFormId, setTrackedFormId] = useState(formId);
  const [month, setMonth] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState<number>(1);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeEntry, setActiveEntry] = useState<FormEntry | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'csv' | null>(null);

  if (trackedFormId !== formId) {
    setTrackedFormId(formId);
    setMonth('');
    setStatusFilter('ALL');
    setPage(1);
    setEmbedOpen(false);
    setEditOpen(false);
    setDeleteOpen(false);
    setActiveEntry(null);
  }

  const formQuery = useFormDetailQuery(formId);
  const form = formQuery.data;
  const resolvedFormId = form?.id || formId;

  const entriesQuery = useFormEntriesQuery(formId, {
    month: month || undefined,
    status: statusFilter,
    page,
    limit: 50,
  });
  const needsSummaryFetch = statusFilter !== 'ALL' || page > 1;
  const summaryQuery = useFormEntriesQuery(
    formId,
    { month: month || undefined, status: 'ALL', page: 1, limit: 200 },
    needsSummaryFetch
  );
  const dispatchMutation = useDispatchFormEntryMutation(resolvedFormId);
  const canResolve = useFolderWriteAccess(folderId || form?.folderId || null);

  const entries = useMemo(() => entriesQuery.data?.entries ?? [], [entriesQuery.data?.entries]);
  const breakdown = useMemo(
    () => countEntryStatuses(needsSummaryFetch ? (summaryQuery.data?.entries ?? entries) : entries),
    [needsSummaryFetch, summaryQuery.data?.entries, entries]
  );

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (!formId) return;
    setExportingFormat(format);
    try {
      const result = await formsService.downloadExport(formId, format, {
        month: month || undefined,
        status: statusFilter,
      });
      triggerBlobDownload(result.blob, result.filename);
      showToast(`Exportación ${format.toUpperCase()} descargada.`, 'success');
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || `No se pudo exportar el archivo .${format}.`, 'error');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleQuickDispatch = async (entryId: string) => {
    try {
      const result = await dispatchMutation.mutateAsync(entryId);
      setActiveEntry((prev) =>
        prev && prev.id === entryId ? { ...prev, dispatchedAt: result.dispatchedAt } : prev
      );
      showToast(`Webhook enviado hacia ${result.targetUrl}.`, 'success');
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudo enviar el webhook.', 'error');
    }
  };

  const backHref = folderId
    ? `/folder/${folderId}`
    : form?.folderId
    ? `/folder/${form.folderId}`
    : '/';

  return (
    <div className={styles.page} data-testid="form-inbox-page">
      <FormInboxHeader
        backHref={backHref}
        formId={formId}
        form={form}
        canManage={canResolve}
        exportingFormat={exportingFormat}
        onOpenEmbed={() => setEmbedOpen(true)}
        onExport={(format) => void handleExport(format)}
        onOpenEdit={() => setEditOpen(true)}
        onOpenDelete={() => setDeleteOpen(true)}
      />

      <section className={styles.statsGrid} aria-label="Resumen numérico de entradas">
        <div className={styles.statCard} data-testid="stat-total">
          <span className={styles.statLabel}>Total</span>
          <span className={styles.statValue}>{breakdown.total}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statNew}`} data-testid="stat-new">
          <span className={styles.statLabel}>Pendientes (NEW)</span>
          <span className={styles.statValue}>{breakdown.NEW}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statValid}`} data-testid="stat-valid">
          <span className={styles.statLabel}>Válidas (VALID)</span>
          <span className={styles.statValue}>{breakdown.VALID}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statInvalid}`} data-testid="stat-invalid">
          <span className={styles.statLabel}>Inválidas (INVALID)</span>
          <span className={styles.statValue}>{breakdown.INVALID}</span>
        </div>
      </section>

      <div className={styles.filterBar}>
        <div className={styles.statusTabs} role="tablist" aria-label="Filtrar por estado">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.value}
              className={`${styles.statusTab} ${
                statusFilter === tab.value ? styles.statusTabActive : ''
              }`}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.monthControl}>
          <label htmlFor="form-month-filter">Mes:</label>
          <input
            id="form-month-filter"
            type="month"
            className={styles.monthInput}
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
            data-testid="form-month-input"
          />
          {month ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<X size={13} />}
              onClick={() => {
                setMonth('');
                setPage(1);
              }}
              aria-label="Limpiar filtro mensual"
            >
              Todos
            </Button>
          ) : null}
        </div>
      </div>

      {formQuery.isLoading || entriesQuery.isLoading ? (
        <Skeleton variant="card" height={240} />
      ) : formQuery.isError ? (
        <EmptyState
          icon={<ClipboardCheck size={22} />}
          title="No se pudo cargar el formulario"
          description="Verifica que el formulario exista y que tengas permisos en esta carpeta."
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={22} />}
          title="Sin entradas registradas"
          description={
            month || statusFilter !== 'ALL'
              ? 'No hay envíos que coincidan con el mes o estado seleccionado.'
              : 'Comparte el endpoint público desde "Integrar en web" para comenzar a recibir entradas.'
          }
        />
      ) : (
        <FormEntriesTable
          form={form}
          entries={entries}
          page={entriesQuery.data?.page ?? page}
          totalPages={entriesQuery.data?.totalPages ?? 1}
          totalEntries={entriesQuery.data?.total ?? entries.length}
          isDispatching={dispatchMutation.isPending}
          canResolve={canResolve}
          onSelectEntry={setActiveEntry}
          onQuickDispatch={(entryId) => void handleQuickDispatch(entryId)}
          onPageChange={setPage}
        />
      )}

      {form && embedOpen ? (
        <FormEmbedDialog open={embedOpen} onOpenChange={setEmbedOpen} form={form} />
      ) : null}

      {form && editOpen ? (
        <EditFormDialog open={editOpen} onOpenChange={setEditOpen} form={form} />
      ) : null}

      {form && deleteOpen ? (
        <DeleteFormDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          form={{ ...form, entriesCount: breakdown.total }}
          onDeleted={() => navigate(backHref, { replace: true })}
        />
      ) : null}

      {form && activeEntry ? (
        <ResolveEntryDialog
          open={Boolean(activeEntry)}
          onOpenChange={(next) => {
            if (!next) setActiveEntry(null);
          }}
          form={form}
          entry={activeEntry}
          canResolve={canResolve}
          onConflictRefresh={() => {
            void entriesQuery.refetch();
            if (needsSummaryFetch) void summaryQuery.refetch();
          }}
        />
      ) : null}
    </div>
  );
};

export default FormInboxPage;
