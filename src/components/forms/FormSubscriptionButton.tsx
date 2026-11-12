/**
 * Control de suscripción a alertas de formularios dinámicos (Fase 19).
 * Consume `GET /api/v1/forms/:id/subscription`, `POST /api/v1/forms/:id/subscribe`
 * y `DELETE /api/v1/forms/:id/subscribe`.
 * @module components/forms/FormSubscriptionButton
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Settings2 } from 'lucide-react';
import { notificationsService } from '../../services/notificationsService';
import { storageService } from '../../services/storageService';
import type { FormSubscriptionPreferences } from '../../types/notifications';

/**
 * Propiedades del botón de suscripción a alertas de un formulario.
 */
export interface FormSubscriptionButtonProps {
  /** ID del formulario dinámico */
  formId: string;
  /** Título opcional del formulario para mensajes de confirmación */
  formTitle?: string;
  /** Si es `true`, consulta siempre el estado inicial al montar */
  autoCheck?: boolean;
  /** Callback opcional para emitir notificaciones Toast */
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Botón interactivo con selector de preferencias (`notifyOnNewEntry`, `notifyOnResolution`)
 * para suscribirse o cancelar la suscripción a eventos de un formulario.
 */
export const FormSubscriptionButton: React.FC<FormSubscriptionButtonProps> = ({
  formId,
  formTitle,
  autoCheck = false,
  onNotify,
}) => {
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<FormSubscriptionPreferences>({
    notifyOnNewEntry: true,
    notifyOnResolution: true,
  });
  const [loading, setLoading] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    const token =
      typeof storageService.getToken === 'function' ? storageService.getToken() : null;
    const shouldFetch =
      autoCheck ||
      Boolean(
        token &&
          !token.startsWith('dev_') &&
          !token.startsWith('mock-') &&
          !token.startsWith('token-')
      );
    if (
      !shouldFetch ||
      !formId ||
      typeof notificationsService?.getFormSubscription !== 'function'
    ) {
      return;
    }

    let active = true;
    notificationsService
      .getFormSubscription(formId)
      .then((res) => {
        if (!active) return;
        setSubscribed(Boolean(res.subscribed));
        if (res.subscription) {
          setPrefs({
            notifyOnNewEntry: res.subscription.notifyOnNewEntry,
            notifyOnResolution: res.subscription.notifyOnResolution,
          });
        }
      })
      .catch(() => {
        // Silencioso en entornos sin backend activo
      });

    return () => {
      active = false;
    };
  }, [formId, autoCheck]);

  /**
   * Alterna la suscripción principal al formulario.
   */
  const handleToggleSubscription = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (subscribed) {
        await notificationsService.unsubscribeFromForm(formId);
        setSubscribed(false);
        setShowPrefs(false);
        onNotify?.(
          `Suscripción cancelada${formTitle ? ` en "${formTitle}"` : ''}`,
          'info'
        );
      } else {
        const sub = await notificationsService.subscribeToForm(formId, prefs);
        setSubscribed(true);
        setPrefs({
          notifyOnNewEntry: sub.notifyOnNewEntry,
          notifyOnResolution: sub.notifyOnResolution,
        });
        onNotify?.(
          `Suscrito a alertas${formTitle ? ` de "${formTitle}"` : ''}`,
          'success'
        );
      }
    } catch (err: unknown) {
      onNotify?.(
        err instanceof Error ? err.message : 'Error al actualizar suscripción',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualiza una preferencia granular (`notifyOnNewEntry` o `notifyOnResolution`) en el backend.
   */
  const handlePreferenceChange = async (
    key: keyof FormSubscriptionPreferences,
    value: boolean
  ) => {
    const nextPrefs: FormSubscriptionPreferences = { ...prefs, [key]: value };
    setPrefs(nextPrefs);
    if (!subscribed) return;
    try {
      await notificationsService.subscribeToForm(formId, nextPrefs);
      onNotify?.('Preferencias de alerta actualizadas', 'success');
    } catch (err: unknown) {
      onNotify?.(
        err instanceof Error ? err.message : 'Error al guardar preferencias',
        'error'
      );
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleToggleSubscription}
        disabled={loading}
        data-testid={`form-subscribe-btn-${formId}`}
        title={
          subscribed
            ? 'Cancelar suscripción a alertas de este formulario'
            : 'Suscribirse a alertas de nuevas entradas y dictámenes'
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 11px',
          borderRadius: 8,
          fontSize: '0.76rem',
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          border: subscribed
            ? '1px solid rgba(16, 185, 129, 0.45)'
            : '1px solid rgba(148, 163, 184, 0.25)',
          background: subscribed
            ? 'rgba(16, 185, 129, 0.14)'
            : 'rgba(15, 23, 42, 0.65)',
          color: subscribed ? '#34d399' : '#cbd5e1',
          transition: 'all 0.15s ease',
        }}
      >
        {subscribed ? <BellRing size={13} /> : <Bell size={13} />}
        <span>{subscribed ? 'Suscrito a alertas' : 'Suscribirse a alertas'}</span>
      </button>

      <button
        type="button"
        onClick={() => setShowPrefs((prev) => !prev)}
        aria-label="Configurar preferencias de alerta"
        data-testid={`form-subscribe-prefs-btn-${formId}`}
        title="Configurar eventos de notificación"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 7,
          border: '1px solid rgba(148, 163, 184, 0.2)',
          background: 'rgba(15, 23, 42, 0.65)',
          color: '#94a3b8',
          cursor: 'pointer',
        }}
      >
        <Settings2 size={13} />
      </button>

      {showPrefs && (
        <div
          role="dialog"
          aria-label="Preferencias de suscripción"
          data-testid={`form-subscribe-prefs-popover-${formId}`}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 230,
            padding: 10,
            borderRadius: 10,
            background: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
            zIndex: 80,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: '0.75rem',
            color: '#e2e8f0',
          }}
        >
          <div style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.7rem' }}>
            EVENTOS A NOTIFICAR
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.notifyOnNewEntry !== false}
              onChange={(e) => handlePreferenceChange('notifyOnNewEntry', e.target.checked)}
            />
            <span>Nuevas entradas recibidas</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.notifyOnResolution !== false}
              onChange={(e) => handlePreferenceChange('notifyOnResolution', e.target.checked)}
            />
            <span>Dictámenes Write-Once</span>
          </label>
        </div>
      )}
    </div>
  );
};
