/**
 * Tabla interactiva de entradas recibidas para un formulario específico.
 * @module components/forms/FormEntriesTable
 */

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';
import type { FormEntry, FormEntryStatus } from '../../types/forms';
import styles from '../../views/FormsStudioView.module.css';

/**
 * Propiedades del componente FormEntriesTable.
 */
export interface FormEntriesTableProps {
  entries: FormEntry[];
  isLoading: boolean;
  onSelectEntry: (entry: FormEntry) => void;
}

/**
 * Renderiza el badge estilizado según el estado de la entrada.
 */
function getStatusBadge(status: FormEntryStatus) {
  switch (status) {
    case 'VALID':
      return <span className={styles.badgeValid}>Válido / Aprobado</span>;
    case 'INVALID':
      return <span className={styles.badgeInvalid}>Inválido / Rechazado</span>;
    default:
      return <span className={styles.badgeNew}>Nuevo / Pendiente</span>;
  }
}

/**
 * Tabla con el listado de respuestas registradas y accesos directos al dictamen Write-Once.
 */
export const FormEntriesTable: React.FC<FormEntriesTableProps> = ({
  entries,
  isLoading,
  onSelectEntry,
}) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha de Ingreso</th>
            <th>Resumen de Datos</th>
            <th>Estado</th>
            <th>Fecha Dictamen</th>
            <th style={{ textAlign: 'right' }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                Cargando entradas...
              </td>
            </tr>
          ) : entries.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                No se encontraron entradas registradas con los filtros aplicados.
              </td>
            </tr>
          ) : (
            entries.map((entry) => {
              const firstTwoKeys = Object.entries(entry.entryPayload || {}).slice(0, 2);
              const summary = firstTwoKeys.map(([k, v]) => `${k}: ${String(v)}`).join(' | ');

              return (
                <tr key={entry.id}>
                  <td style={{ fontFamily: 'monospace' }}>#{entry.id.slice(0, 8)}</td>
                  <td>{new Date(entry.createdAt).toLocaleDateString()}</td>
                  <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {summary || '(Sin datos)'}
                  </td>
                  <td>{getStatusBadge(entry.status)}</td>
                  <td>{entry.resolvedAt ? new Date(entry.resolvedAt).toLocaleDateString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Button
                      variant={entry.status === 'NEW' ? 'primary' : 'secondary'}
                      onClick={() => onSelectEntry(entry)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <ShieldCheck size={14} />
                      <span>{entry.status === 'NEW' ? 'Dictaminar' : 'Ver Detalle'}</span>
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

