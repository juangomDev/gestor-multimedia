import React, { useId, useState } from 'react';
import { Save } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../context/useToast';
import { useUpdateApiKeyMutation } from '../../queries/useAdminQueries';
import type { ApiKeyItem } from '../../services/apiKeysService';
import shared from './AdminShared.module.css';
import controls from './AdminControls.module.css';

/**
 * Propiedades del diálogo de edición de una API Key existente (`EditApiKeyDialog`).
 */
export interface EditApiKeyDialogProps {
  apiKey: ApiKeyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo editorial para editar nombre, descripción, cuota `rateLimit` y estado activo/pausado
 * de una API Key sin revocar la llave criptográfica (`PATCH /api/v1/api-keys/:id`).
 */
export const EditApiKeyDialog: React.FC<EditApiKeyDialogProps> = ({
  apiKey,
  open,
  onOpenChange,
}) => {
  const formId = useId();
  const activeSwitchId = useId();
  const { showToast } = useToast();
  const updateKey = useUpdateApiKeyMutation();

  const snapshotKey = `${open}:${apiKey?.id ?? ''}:${apiKey?.name ?? ''}:${
    apiKey?.description ?? ''
  }:${apiKey?.rateLimit ?? 120}:${Boolean(apiKey?.isActive)}`;
  const [trackedKey, setTrackedKey] = useState(snapshotKey);
  const [name, setName] = useState(apiKey?.name ?? '');
  const [description, setDescription] = useState(apiKey?.description ?? '');
  const [rateLimit, setRateLimit] = useState(String(apiKey?.rateLimit ?? 120));
  const [isActive, setIsActive] = useState(Boolean(apiKey?.isActive ?? true));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (snapshotKey !== trackedKey) {
    setTrackedKey(snapshotKey);
    if (apiKey) {
      setName(apiKey.name);
      setDescription(apiKey.description ?? '');
      setRateLimit(String(apiKey.rateLimit));
      setIsActive(apiKey.isActive);
      setErrorMsg(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('El nombre de la API Key es obligatorio.');
      return;
    }
    const parsedLimit = Number.parseInt(rateLimit, 10);
    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100000) {
      setErrorMsg('Introduce una cuota válida entre 1 y 100000 req/min.');
      return;
    }

    setErrorMsg(null);
    try {
      await updateKey.mutateAsync({
        id: apiKey.id,
        payload: {
          name: cleanName,
          description: description.trim() || null,
          rateLimit: parsedLimit,
          isActive,
        },
      });
      showToast(`API Key "${cleanName}" actualizada.`, 'success');
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      setErrorMsg(detail || 'No se pudo actualizar la API Key.');
    }
  };

  return (
    <Dialog
      open={open && Boolean(apiKey)}
      onOpenChange={onOpenChange}
      title={apiKey ? `Editar "${apiKey.name}"` : 'Editar API Key'}
      description={
        apiKey
          ? `Prefijo inmutable: ${apiKey.keyPrefix}••• · Los cambios aplican sin rotar el secreto.`
          : undefined
      }
      size="sm"
      footer={
        <div className={shared.footerActions}>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={updateKey.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            icon={<Save size={14} />}
            loading={updateKey.isPending}
            data-testid="edit-apikey-submit-btn"
          >
            Guardar cambios
          </Button>
        </div>
      }
    >
      <form id={formId} className={shared.panel} onSubmit={(e) => void handleSubmit(e)} noValidate>
        <Input
          label="Nombre descriptivo"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          disabled={updateKey.isPending}
          required
        />
        <Input
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Sistema consumidor o propietario"
          disabled={updateKey.isPending}
        />
        <Input
          label="Límite por minuto (req/min)"
          type="number"
          min={1}
          max={100000}
          mono
          value={rateLimit}
          onChange={(e) => {
            setRateLimit(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          disabled={updateKey.isPending}
        />

        <div className={controls.switchRow}>
          <label htmlFor={activeSwitchId} className={controls.switchText}>
            <span className={controls.switchTitle}>Clave activa</span>
            <span className={controls.switchSub}>
              Pausa temporalmente las solicitudes sin destruir el secreto.
            </span>
          </label>
          <Switch
            id={activeSwitchId}
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={updateKey.isPending}
            ariaLabel="Activar o pausar la API Key"
          />
        </div>

        {errorMsg ? (
          <div className={shared.warnAlert} role="alert" data-testid="edit-apikey-error">
            {errorMsg}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
};
