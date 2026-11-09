/**
 * Modal para dictaminar y sellar inmutablemente entradas de formulario (Write-Once).
 * @module components/forms/ResolveEntryModal
 */

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Send, Lock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { FormEntry, FormDefinition, FormResolutionState } from '../../types/forms';
import { formsService } from '../../services/formsService';
import styles from './ResolveEntryModal.module.css';

/**
 * Propiedades del componente ResolveEntryModal.
 */
export interface ResolveEntryModalProps {
  /** Indica si el modal está abierto */
  isOpen: boolean;
  /** Función para cerrar el modal */
  onClose: () => void;
  /** Entrada actual a resolver o inspeccionar */
  entry: FormEntry | null;
  /** Definición del formulario asociado */
  form: FormDefinition;
  /** Callback al resolver exitosamente la entrada */
  onResolved: (updated: FormEntry) => void;
  /** Callback de notificación */
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Componente modal de resolución única (Write-Once) para entradas de formulario.
 */
export const ResolveEntryModal: React.FC<ResolveEntryModalProps> = ({
  isOpen,
  onClose,
  entry,
  form,
  onResolved,
  onNotify,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<FormResolutionState>('VALID');
  const [resolutionData, setResolutionData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!entry) return null;

  const isSealed = entry.status === 'VALID' || entry.status === 'INVALID';

  const handleFieldChange = (name: string, value: unknown) => {
    setResolutionData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSealed) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const updated = await formsService.resolveEntry(entry.id, {
        resolutionPayload: resolutionData,
        status: selectedStatus,
      });
      onNotify?.(`Entrada sellada exitosamente como ${selectedStatus}`, 'success');
      onResolved(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al sellar la resolución');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async () => {
    try {
      setIsDispatching(true);
      const res = await formsService.dispatchEntry(entry.id);
      onNotify?.(`Despachado exitosamente a ${res.targetUrl}`, 'success');
      onResolved({ ...entry, dispatchedAt: res.dispatchedAt });
    } catch (err: unknown) {
      onNotify?.(err instanceof Error ? err.message : 'Error al despachar entrada', 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resolución de Entrada #${entry.id.slice(0, 8)}`}
      wide={true}
    >
      <form onSubmit={handleResolve} className={styles.container}>
        {error && <div style={{ color: '#ef4444', fontSize: '0.8125rem' }}>{error}</div>}

        {isSealed ? (
          <div className={`${styles.notice} ${styles.noticeSealed}`}>
            <Lock size={16} />
            <span>
              <strong>Registro Sellado:</strong> Esta entrada fue dictaminada como{' '}
              <strong>{entry.status}</strong> el {new Date(entry.resolvedAt || '').toLocaleString()}.
              No admite modificaciones adicionales (Write-Once).
            </span>
          </div>
        ) : (
          <div className={`${styles.notice} ${styles.noticeWarning}`}>
            <ShieldAlert size={16} />
            <span>
              <strong>Acción Inmutable (Write-Once):</strong> Al dictaminar esta entrada, los datos
              de resolución quedarán sellados permanentemente en la base de datos.
            </span>
          </div>
        )}

        {/* Datos provistos por el usuario */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Datos Registrados por el Usuario</div>
          <div className={styles.grid}>
            {Object.entries(entry.entryPayload || {}).map(([key, value]) => {
              const schemaField = form.entryFieldsSchema.find((f) => f.name === key);
              const label = schemaField ? schemaField.label : key;
              return (
                <div key={key} className={styles.fieldItem}>
                  <span className={styles.fieldLabel}>{label}</span>
                  <span className={styles.fieldValue}>{String(value ?? '—')}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campos de resolución interna */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Dictamen de Resolución Oficial</div>

          {isSealed ? (
            <div className={styles.grid}>
              {Object.entries(entry.resolutionPayload || {}).map(([key, value]) => {
                const schemaField = form.resolutionFieldsSchema.find((f) => f.name === key);
                const label = schemaField ? schemaField.label : key;
                return (
                  <div key={key} className={styles.fieldItem}>
                    <span className={styles.fieldLabel}>{label}</span>
                    <span className={styles.fieldValue}>{String(value ?? '—')}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.statusSelector}>
                <button
                  type="button"
                  className={`${styles.statusOption} ${
                    selectedStatus === 'VALID' ? styles.statusOptionSelectedValid : ''
                  }`}
                  onClick={() => setSelectedStatus('VALID')}
                >
                  <CheckCircle2 size={18} />
                  <span>Aprobar / Válido (VALID)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.statusOption} ${
                    selectedStatus === 'INVALID' ? styles.statusOptionSelectedInvalid : ''
                  }`}
                  onClick={() => setSelectedStatus('INVALID')}
                >
                  <XCircle size={18} />
                  <span>Rechazar / Inválido (INVALID)</span>
                </button>
              </div>

              {form.resolutionFieldsSchema.map((field) => (
                <div key={field.name} className={styles.inputGroup}>
                  <label htmlFor={`res-${field.name}`}>
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`res-${field.name}`}
                      className={styles.textarea}
                      rows={3}
                      required={field.required}
                      placeholder={field.placeholder || 'Ingrese comentarios del dictamen...'}
                      value={(resolutionData[field.name] as string) || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    />
                  ) : (
                    <input
                      id={`res-${field.name}`}
                      className={styles.input}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      value={(resolutionData[field.name] as string) || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className={styles.footer}>
          <div>
            {isSealed && form.externalTargetUrl && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleDispatch}
                disabled={isDispatching}
              >
                <Send size={14} />
                <span>{entry.dispatchedAt ? 'Re-despachar a Webhook' : 'Despachar a Webhook'}</span>
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              {isSealed ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isSealed && (
              <Button type="submit" variant="primary" loading={isSubmitting}>
                <ShieldCheck size={16} />
                <span>Sellar Dictamen (Write-Once)</span>
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

