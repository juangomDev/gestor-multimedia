import React, { useId, useState } from 'react';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/useToast';
import {
  useApiKeysQuery,
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
} from '../../queries/useAdminQueries';
import { copyToClipboard } from '../../utils/clipboard';
import { formatDate } from '../../utils/formatters';
import type { ApiKeyCreatedResponse, ApiKeyItem } from '../../services/apiKeysService';
import styles from './AdminShared.module.css';

/**
 * Panel exclusivo `ADMIN` de emisión, listado y revocación de claves API M2M (`/api/v1/api-keys`).
 * Muestra el secreto plano `mk_live_...` una sola vez tras emitirse con copia segura al portapapeles.
 */
export const ApiKeysPanel: React.FC = () => {
  const createFormId = useId();
  const { showToast } = useToast();

  const keysQuery = useApiKeysQuery();
  const createKey = useCreateApiKeyMutation();
  const deleteKey = useDeleteApiKeyMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rateLimit, setRateLimit] = useState('120');
  const [issuedSecret, setIssuedSecret] = useState<ApiKeyCreatedResponse | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [revokingKey, setRevokingKey] = useState<ApiKeyItem | null>(null);

  const keys = keysQuery.data ?? [];

  const handleIssueKey = async (e: React.FormEvent) => {
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
      setIssuedSecret(created);
      setCopiedSecret(false);
      setName('');
      setDescription('');
      setRateLimit('120');
      setCreateOpen(false);
      showToast(`API Key "${created.name}" emitida. Copia el secreto ahora.`, 'success');
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudo emitir la API Key.', 'error');
    }
  };

  const handleCopySecret = async () => {
    if (!issuedSecret?.key) return;
    const ok = await copyToClipboard(issuedSecret.key);
    if (ok) {
      setCopiedSecret(true);
      showToast('Secreto API copiado al portapapeles.', 'success');
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokingKey) return;
    try {
      await deleteKey.mutateAsync(revokingKey.id);
      showToast(`API Key "${revokingKey.name}" revocada permanentemente.`, 'info');
      setRevokingKey(null);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudo revocar la API Key.', 'error');
    }
  };

  return (
    <div className={styles.panel} data-testid="api-keys-panel">
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.sectionTitle}>Claves de integración M2M (API Keys)</h2>
          <p className={styles.sectionDesc}>
            Acceso programático mediante cabecera <code>X-API-Key</code>. El secreto completo solo
            se revela una única vez al crearse.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setCreateOpen(true)}
          data-testid="open-create-apikey-btn"
        >
          Emitir API Key
        </Button>
      </div>

      {issuedSecret ? (
        <div className={styles.secretBox} role="status" data-testid="issued-apikey-secret-box">
          <span className={styles.secretTitle}>
            Secreto generado por única vez para &ldquo;{issuedSecret.name}&rdquo; — guárdalo en un
            gestor seguro ahora:
          </span>
          <div className={styles.secretCodeRow}>
            <code data-testid="issued-apikey-value">{issuedSecret.key}</code>
            <Button
              variant="secondary"
              size="sm"
              icon={copiedSecret ? <Check size={13} /> : <Copy size={13} />}
              onClick={() => void handleCopySecret()}
              data-testid="copy-apikey-secret-btn"
            >
              {copiedSecret ? 'Copiada' : 'Copiar clave'}
            </Button>
          </div>
          <div className={styles.footerActions}>
            <Button variant="ghost" size="sm" onClick={() => setIssuedSecret(null)}>
              Ya la guardé, ocultar secreto
            </Button>
          </div>
        </div>
      ) : null}

      {keysQuery.isLoading ? (
        <Skeleton variant="card" height={200} />
      ) : keysQuery.isError ? (
        <EmptyState
          icon={<KeyRound size={22} />}
          title="No se pudieron cargar las API Keys"
          description="Verifica los permisos de administrador contra /api/v1/api-keys."
        />
      ) : keys.length === 0 ? (
        <EmptyState
          icon={<KeyRound size={22} />}
          title="Sin API Keys emitidas"
          description="Emite una clave para integraciones externas, pipelines ETL o servicios automatizados."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} data-testid="api-keys-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Prefijo</th>
                <th>Cuota</th>
                <th>Último uso</th>
                <th>Creada</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {keys.map((item) => (
                <tr key={item.id} className={styles.row} data-testid={`apikey-row-${item.id}`}>
                  <td>
                    <div className={styles.monoPrimary}>{item.name}</div>
                    {item.description ? (
                      <div className={styles.sectionDesc}>{item.description}</div>
                    ) : null}
                  </td>
                  <td>
                    <Badge tone="neutral" mono>
                      {item.keyPrefix}•••
                    </Badge>
                  </td>
                  <td className={styles.mono}>{item.rateLimit} req/min</td>
                  <td className={styles.mono}>
                    {item.lastUsedAt ? formatDate(item.lastUsedAt) : 'Nunca usada'}
                  </td>
                  <td className={styles.mono}>{formatDate(item.createdAt)}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={13} />}
                      onClick={() => setRevokingKey(item)}
                      data-testid={`revoke-apikey-btn-${item.id}`}
                    >
                      Revocar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Emitir nueva API Key"
        description="El secreto criptográfico solo podrá visualizarse inmediatamente tras su creación."
        size="sm"
        footer={
          <div className={styles.footerActions}>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={createFormId}
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
        <form id={createFormId} className={styles.panel} onSubmit={(e) => void handleIssueKey(e)}>
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

      <Dialog
        open={Boolean(revokingKey)}
        onOpenChange={(open) => {
          if (!open) setRevokingKey(null);
        }}
        title="Revocar API Key"
        size="sm"
        footer={
          <div className={styles.footerActions}>
            <Button variant="ghost" onClick={() => setRevokingKey(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={14} />}
              loading={deleteKey.isPending}
              onClick={() => void handleConfirmRevoke()}
              data-testid="confirm-revoke-apikey-btn"
            >
              Revocar definitivamente
            </Button>
          </div>
        }
      >
        <p className={styles.sectionDesc}>
          ¿Revocar permanentemente la clave <strong>{revokingKey?.name}</strong> (
          <code>{revokingKey?.keyPrefix}•••</code>)? Cualquier cliente externo que la use perderá
          acceso de inmediato.
        </p>
      </Dialog>
    </div>
  );
};
