import React, { useState } from 'react';
import { Server, RotateCcw, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverTrigger, PopoverContent } from '../../components/ui/Popover';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { storageService, DEFAULT_CONFIG } from '../../services/storageService';
import { healthService } from '../../services/healthService';
import { queryKeys } from '../../queries/queryKeys';
import { useToast } from '../../context/useToast';
import styles from './ServerUrlPopover.module.css';

/**
 * Propiedades del popover secundario para cambiar la URL base del backend en `/login`.
 */
export interface ServerUrlPopoverProps {
  /** Callback opcional ejecutado tras guardar y probar una nueva URL de servidor. */
  onServerChanged?: (newBaseUrl: string) => void;
}

/**
 * Popover accesible (Radix Popover) para configurar `apiBaseUrl` antes de iniciar sesión,
 * probar `GET /health` contra el destino y restablecer el valor de `VITE_API_BASE_URL`.
 */
export const ServerUrlPopover: React.FC<ServerUrlPopoverProps> = ({ onServerChanged }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [urlValue, setUrlValue] = useState(() => storageService.getApiBaseUrl());
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setUrlValue(storageService.getApiBaseUrl());
      setError(null);
    }
    setOpen(nextOpen);
  };

  const handleReset = () => {
    setUrlValue(DEFAULT_CONFIG.baseUrl);
    setError(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = urlValue.trim().replace(/\/+$/, '');
    if (!cleaned) {
      setError('Introduce una URL válida para el servidor API.');
      return;
    }
    if (!/^https?:\/\/.+/i.test(cleaned)) {
      setError('La dirección debe comenzar con http:// o https://');
      return;
    }

    setError(null);
    setTesting(true);
    try {
      const savedUrl = storageService.setApiBaseUrl(cleaned);
      const health = await healthService.checkHealth();
      queryClient.setQueryData(queryKeys.health.status(), health);
      onServerChanged?.(savedUrl);

      if (health.status === 'ok') {
        showToast(`Conectado a ${savedUrl} (${health.latencyMs ?? 0} ms)`, 'success');
      } else {
        showToast(`URL guardada (${savedUrl}), pero el servidor responde degradado`, 'warning');
      }
      setOpen(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className={styles.triggerBtn}>
          <Server size={14} aria-hidden="true" />
          <span>Cambiar servidor API</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className={styles.popover}>
        <div className={styles.header}>
          <span className={styles.title}>Servidor API</span>
          <span className={styles.subtitle}>
            Ajusta el destino de monolith-backend (entorno local o instancia Dokploy).
          </span>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <Input
            label="URL base del backend"
            mono
            value={urlValue}
            onChange={(e) => {
              setUrlValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="http://localhost:3000"
            error={error}
            disabled={testing}
          />

          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={handleReset}
              disabled={testing}
            >
              Por defecto
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Check size={14} />}
              loading={testing}
            >
              Guardar y probar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};
