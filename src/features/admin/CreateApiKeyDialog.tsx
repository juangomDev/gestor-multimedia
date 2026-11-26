import React, { useId, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/useToast';
import { useCreateApiKeyMutation } from '../../queries/useAdminQueries';
import type { ApiKeyCreatedResponse } from '../../services/apiKeysService';
import styles from './AdminShared.module.css';

/**
 * Propiedades del diálogo de emisión de una nueva API Key (`CreateApiKeyDialog`).
 */
export interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: (created: ApiKeyCreatedResponse) => void;
}

/**
 * Diálogo editorial para emitir una nueva clave API M2M (`POST /api/v1/api-keys`).
 */
export const CreateApiKeyDialog: React.FC<CreateApiKeyDialogProps> = ({
  open,
  onOpenChange,
  onIssued,
}) => {
  const formId = useId();
  const { showToast } = useToast();
  const createKey = useCreateApiKeyMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rateLimit, setRateLimit] = useState('120');

  const resetForm = () => {
    setName('');
    setDescription('');
    setRateLimit('120');
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const parsedLimit = Number.parseInt(rateLimit, 10);
    try {
      const created = await createKey.mutateAsync({
        name: cleanName,
        description: description.trim() || undefined,
        rateLimit: !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 120,
      });
      onIssued(created);
      showToast(`API Key "${created.name}" emitida. Copia el secreto ahora.`, 'success');
      handleClose(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudo emitir la API Key.', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Emitir nueva API Key"
      description="El secreto criptográfico solo podrá visualizarse inmediatamente tras su creación."
      size="sm"
      footer={
        <div className={styles.footerActions}>
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            icon={<KeyRound size={14} />}
            loading={createKey.isPending}
            data-testid="create-apikey-submit-btn"
          >
            Emitir clave
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.panel} onSubmit={(e) => void handleSubmit(e)}>
        <Input
          label="Nombre descriptivo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Integración ERP Producción"
          required
          autoFocus
        />
        <Input
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Sistema consumidor o propietario"
        />
        <Input
          label="Límite por minuto (req/min)"
          type="number"
          min={10}
          max={10000}
          mono
          value={rateLimit}
          onChange={(e) => setRateLimit(e.target.value)}
        />
      </form>
    </Dialog>
  );
};
