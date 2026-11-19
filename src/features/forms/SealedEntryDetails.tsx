import React from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/formatters';
import { formatPayloadValue } from './formHelpers';
import type { FormDefinition, FormEntry } from '../../types/forms';
import styles from './ResolveEntryDialog.module.css';

/**
 * Propiedades del resumen de entrada sellada y caja de despacho webhook (`SealedEntryDetails`).
 */
export interface SealedEntryDetailsProps {
  form: FormDefinition;
  entry: FormEntry;
  isDispatching: boolean;
  onDispatch: () => void;
}

/**
 * Muestra el dictamen inmutable sellado de una entrada (`resolutionPayload`, `resolvedAt`)
 * y el control de despacho bajo demanda hacia `externalTargetUrl` (`POST .../dispatch`).
 */
export const SealedEntryDetails: React.FC<SealedEntryDetailsProps> = ({
  form,
  entry,
  isDispatching,
  onDispatch,
}) => (
  <>
    <section className={styles.summaryCard}>
      <div className={styles.sectionHeading}>
        <span className={styles.sectionTitle}>Dictamen sellado (inmutable)</span>
        {entry.resolvedAt ? (
          <span className={styles.kvKey}>{formatDate(entry.resolvedAt)}</span>
        ) : null}
      </div>
      {entry.resolutionPayload && Object.keys(entry.resolutionPayload).length > 0 ? (
        <dl className={styles.kvGrid}>
          {Object.entries(entry.resolutionPayload).map(([key, val]) => (
            <div key={key} className={styles.kvItem}>
              <dt className={styles.kvKey}>{key}</dt>
              <dd className={styles.kvVal}>{formatPayloadValue(val)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={styles.kvKey}>Sin campos adicionales de resolución.</p>
      )}
    </section>

    {form.externalTargetUrl ? (
      <div className={styles.webhookBox} data-testid="sealed-webhook-box">
        <div className={styles.webhookInfo}>
          <span>Destino webhook externo:</span>
          <code className={styles.webhookUrl}>{form.externalTargetUrl}</code>
          <span>
            {entry.dispatchedAt
              ? `Último envío: ${formatDate(entry.dispatchedAt)}`
              : 'Aún no despachado al destino externo.'}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Send size={14} />}
          loading={isDispatching}
          onClick={onDispatch}
          data-testid="resolve-dialog-dispatch-btn"
        >
          {entry.dispatchedAt ? 'Reenviar webhook' : 'Despachar webhook'}
        </Button>
      </div>
    ) : null}
  </>
);
