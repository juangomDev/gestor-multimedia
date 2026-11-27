import React from 'react';
import { ChevronLeft, ChevronRight, Lock, Send, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';
import { formatPayloadValue } from './formHelpers';
import type { FormDefinition, FormEntry } from '../../types/forms';
import styles from './FormInboxPage.module.css';

/**
 * Propiedades de la tabla de entradas de `FormInboxPage` (`FormEntriesTable`).
 */
export interface FormEntriesTableProps {
  form: FormDefinition | undefined;
  entries: FormEntry[];
  page: number;
  totalPages: number;
  totalEntries: number;
  isDispatching: boolean;
  canResolve?: boolean;
  /** Habilita la eliminación individual de entradas (solo propietario de carpeta o `ADMIN`). */
  canDeleteEntry?: boolean;
  onSelectEntry: (entry: FormEntry) => void;
  onQuickDispatch: (entryId: string) => void;
  /** Callback al pulsar eliminar sobre una entrada individual. */
  onDeleteEntry?: (entry: FormEntry) => void;
  onPageChange: (nextPage: number) => void;
}

/**
 * Tabla editorial de entradas del formulario con `content-visibility: auto`,
 * badges de estado (`NEW / VALID / INVALID`), acciones Write-Once y paginación.
 */
export const FormEntriesTable: React.FC<FormEntriesTableProps> = ({
  form,
  entries,
  page,
  totalPages,
  totalEntries,
  isDispatching,
  canResolve = true,
  canDeleteEntry = false,
  onSelectEntry,
  onQuickDispatch,
  onDeleteEntry,
  onPageChange,
}) => (
  <div className={styles.tableWrap}>
    <table className={styles.table} data-testid="form-entries-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Datos de entrada</th>
          <th>Estado</th>
          <th>Dictamen / Webhook</th>
          <th aria-label="Acciones" />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const previewKeys = (
            form?.entryFieldsSchema?.map((f) => f.name) ?? Object.keys(entry.entryPayload)
          ).slice(0, 4);

          return (
            <tr key={entry.id} className={styles.entryRow}>
              <td className={styles.monoCell}>{formatDate(entry.createdAt)}</td>
              <td>
                <div className={styles.payloadPreview}>
                  {previewKeys.map((key) => (
                    <span key={key} className={styles.payloadPair}>
                      <span className={styles.payloadKey}>{key}:</span>{' '}
                      {formatPayloadValue(entry.entryPayload[key])}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <Badge
                  tone={
                    entry.status === 'VALID'
                      ? 'ok'
                      : entry.status === 'INVALID'
                      ? 'danger'
                      : 'warn'
                  }
                  mono
                >
                  {entry.status}
                </Badge>
              </td>
              <td className={styles.monoCell}>
                {entry.resolvedAt ? (
                  <div>
                    <span>Sellado {formatDate(entry.resolvedAt)}</span>
                    {entry.dispatchedAt ? (
                      <div>
                        <Badge tone="accent" mono>
                          Webhook OK
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  'Pendiente de dictamen'
                )}
              </td>
              <td>
                <div className={styles.rowActions}>
                  {entry.status === 'NEW' ? (
                    canResolve ? (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Lock size={13} />}
                        onClick={() => onSelectEntry(entry)}
                        data-testid={`resolve-btn-${entry.id}`}
                      >
                        Dictaminar
                      </Button>
                    ) : (
                      <Badge tone="neutral">Solo lectura</Badge>
                    )
                  ) : (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => onSelectEntry(entry)}>
                        Ver dictamen
                      </Button>
                      {form?.externalTargetUrl && canResolve ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Send size={13} />}
                          loading={isDispatching}
                          onClick={() => onQuickDispatch(entry.id)}
                          data-testid={`dispatch-btn-${entry.id}`}
                        >
                          Reenviar
                        </Button>
                      ) : null}
                    </>
                  )}
                  {canDeleteEntry && onDeleteEntry ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={styles.deleteEntryBtn}
                      icon={<Trash2 size={13} />}
                      onClick={() => onDeleteEntry(entry)}
                      aria-label={`Eliminar entrada ${entry.id}`}
                      title="Eliminar entrada permanentemente"
                      data-testid={`delete-entry-btn-${entry.id}`}
                    />
                  ) : null}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {totalPages > 1 ? (
      <div className={styles.paginationBar}>
        <span>
          Página {page} de {totalPages} · {totalEntries} entradas
        </span>
        <div className={styles.paginationBtns}>
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronLeft size={14} />}
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            iconRight={<ChevronRight size={14} />}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    ) : null}
  </div>
);
