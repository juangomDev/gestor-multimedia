import React, { useState } from 'react';
import { Check, Copy, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Switch } from '../../components/ui/Switch';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/useToast';
import {
  useApiKeysQuery,
  useDeleteApiKeyMutation,
  useUpdateApiKeyMutation,
} from '../../queries/useAdminQueries';
import { copyToClipboard } from '../../utils/clipboard';
import { formatDate } from '../../utils/formatters';
import { CreateApiKeyDialog } from './CreateApiKeyDialog';
import { EditApiKeyDialog } from './EditApiKeyDialog';
import type { ApiKeyCreatedResponse, ApiKeyItem } from '../../services/apiKeysService';
import styles from './AdminShared.module.css';
import controls from './AdminControls.module.css';

/**
 * Panel exclusivo `ADMIN` de emisión, configuración (`PATCH /api/v1/api-keys/:id`),
 * pausa/reactivación instantánea y revocación de claves API M2M (`/api/v1/api-keys`).
 */
export const ApiKeysPanel: React.FC = () => {
  const { showToast } = useToast();

  const keysQuery = useApiKeysQuery();
  const updateKey = useUpdateApiKeyMutation();
  const deleteKey = useDeleteApiKeyMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyItem | null>(null);
  const [issuedSecret, setIssuedSecret] = useState<ApiKeyCreatedResponse | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [revokingKey, setRevokingKey] = useState<ApiKeyItem | null>(null);

  const keys = keysQuery.data ?? [];

  const handleCopySecret = async () => {
    if (!issuedSecret?.key) return;
    const ok = await copyToClipboard(issuedSecret.key);
    if (ok) {
      setCopiedSecret(true);
      showToast('Secreto API copiado al portapapeles.', 'success');
    }
  };

  const handleToggleActive = async (item: ApiKeyItem, nextActive: boolean) => {
    try {
      await updateKey.mutateAsync({ id: item.id, payload: { isActive: nextActive } });
      showToast(
        nextActive
          ? `API Key "${item.name}" reactivada.`
          : `API Key "${item.name}" pausada temporalmente.`,
        'info'
      );
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudo cambiar el estado de la API Key.', 'error');
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
            Acceso programático mediante cabecera <code>X-API-Key</code>. Pausa, ajusta cuotas o
            revoca claves sin afectar el resto de integraciones.
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
                <th>Estado</th>
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
                  <td>
                    <div className={controls.statusCell}>
                      <Switch
                        checked={item.isActive}
                        disabled={updateKey.isPending}
                        ariaLabel={`Estado activo de ${item.name}`}
                        onCheckedChange={(checked) => void handleToggleActive(item, checked)}
                      />
                      <Badge tone={item.isActive ? 'ok' : 'warn'}>
                        {item.isActive ? 'Activa' : 'Pausada'}
                      </Badge>
                    </div>
                  </td>
                  <td className={styles.mono}>{item.rateLimit} req/min</td>
                  <td className={styles.mono}>
                    {item.lastUsedAt ? formatDate(item.lastUsedAt) : 'Nunca usada'}
                  </td>
                  <td className={styles.mono}>{formatDate(item.createdAt)}</td>
                  <td>
                    <div className={controls.rowActions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={13} />}
                        onClick={() => setEditingKey(item)}
                        data-testid={`edit-apikey-btn-${item.id}`}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={13} />}
                        onClick={() => setRevokingKey(item)}
                        data-testid={`revoke-apikey-btn-${item.id}`}
                      >
                        Revocar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onIssued={(created) => {
          setIssuedSecret(created);
          setCopiedSecret(false);
        }}
      />

      <EditApiKeyDialog
        apiKey={editingKey}
        open={Boolean(editingKey)}
        onOpenChange={(open) => {
          if (!open) setEditingKey(null);
        }}
      />

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
