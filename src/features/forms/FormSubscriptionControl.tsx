import React, { useId, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/Popover';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../context/useToast';
import {
  useFormSubscriptionQuery,
  useSubscribeFormMutation,
  useUnsubscribeFormMutation,
} from '../../queries/useFormsQueries';
import styles from './FormSubscriptionControl.module.css';

/**
 * Propiedades del control de suscripción a alertas de formulario (`FormSubscriptionControl`).
 */
export interface FormSubscriptionControlProps {
  /** UUID del formulario sobre el que se gestiona la suscripción. */
  formId: string;
}

/**
 * Control desplegable Radix Popover para gestionar la suscripción del usuario actual a alertas
 * en vivo del formulario (`GET/POST/DELETE /api/v1/forms/:id/subscribe`) configurando
 * `notifyOnNewEntry` y `notifyOnResolution`.
 */
export const FormSubscriptionControl: React.FC<FormSubscriptionControlProps> = ({ formId }) => {
  const newEntryId = useId();
  const resolutionId = useId();
  const { showToast } = useToast();

  const subQuery = useFormSubscriptionQuery(formId);
  const subscribe = useSubscribeFormMutation(formId);
  const unsubscribe = useUnsubscribeFormMutation(formId);

  const [open, setOpen] = useState(false);
  const [notifyNew, setNotifyNew] = useState(true);
  const [notifyResolved, setNotifyResolved] = useState(true);
  const [syncedKey, setSyncedKey] = useState('');

  const serverKey = subQuery.data
    ? `${subQuery.data.subscribed}:${subQuery.data.subscription?.notifyOnNewEntry ?? true}:${subQuery.data.subscription?.notifyOnResolution ?? true}`
    : '';
  if (serverKey && serverKey !== syncedKey) {
    setSyncedKey(serverKey);
    if (subQuery.data?.subscription) {
      setNotifyNew(subQuery.data.subscription.notifyOnNewEntry);
      setNotifyResolved(subQuery.data.subscription.notifyOnResolution);
    } else {
      setNotifyNew(true);
      setNotifyResolved(true);
    }
  }

  const isSubscribed = Boolean(subQuery.data?.subscribed);
  const isBusy = subscribe.isPending || unsubscribe.isPending;

  const handleSave = async () => {
    try {
      await subscribe.mutateAsync({
        notifyOnNewEntry: notifyNew,
        notifyOnResolution: notifyResolved,
      });
      showToast(
        isSubscribed ? 'Preferencias de alertas actualizadas.' : 'Suscripción activada.',
        'success'
      );
      setOpen(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudo guardar la suscripción.', 'error');
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe.mutateAsync();
      showToast('Suscripción cancelada para este formulario.', 'info');
      setOpen(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudo cancelar la suscripción.', 'error');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isSubscribed ? 'primary' : 'secondary'}
          size="sm"
          icon={isSubscribed ? <BellRing size={14} /> : <Bell size={14} />}
          data-testid="form-subscription-trigger"
        >
          {isSubscribed ? 'Alertas activas' : 'Suscribirme'}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end">
        <div className={styles.panel} data-testid="form-subscription-panel">
          <div className={styles.header}>
            <h3 className={styles.title}>Alertas del formulario</h3>
            <p className={styles.subtitle}>
              Recibe notificaciones en tiempo real sobre eventos de esta bandeja.
            </p>
          </div>

          <div className={styles.optionRow}>
            <div className={styles.optionCopy}>
              <label htmlFor={newEntryId} className={styles.optionLabel}>
                Nuevas entradas
              </label>
              <span className={styles.optionHint}>Al registrarse un envío público</span>
            </div>
            <Switch
              id={newEntryId}
              checked={notifyNew}
              onCheckedChange={setNotifyNew}
              disabled={isBusy}
            />
          </div>

          <div className={styles.optionRow}>
            <div className={styles.optionCopy}>
              <label htmlFor={resolutionId} className={styles.optionLabel}>
                Dictámenes sellados
              </label>
              <span className={styles.optionHint}>Al resolverse una entrada</span>
            </div>
            <Switch
              id={resolutionId}
              checked={notifyResolved}
              onCheckedChange={setNotifyResolved}
              disabled={isBusy}
            />
          </div>

          <div className={styles.actions}>
            {isSubscribed ? (
              <Button
                variant="ghost"
                size="sm"
                icon={<BellOff size={13} />}
                loading={unsubscribe.isPending}
                onClick={() => void handleUnsubscribe()}
                data-testid="form-unsubscribe-btn"
              >
                Desuscribir
              </Button>
            ) : (
              <span />
            )}

            <Button
              variant="primary"
              size="sm"
              loading={subscribe.isPending}
              disabled={!notifyNew && !notifyResolved}
              onClick={() => void handleSave()}
              data-testid="form-subscribe-save-btn"
            >
              {isSubscribed ? 'Guardar' : 'Activar alertas'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
