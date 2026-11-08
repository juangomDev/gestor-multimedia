import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, ShieldAlert, Clock, Activity } from 'lucide-react';
import { Button } from '../common/Button';
import { apiKeysService, type ApiKeyItem } from '../../services/apiKeysService';
import { useToast } from '../../context/useToast';
import { CreateApiKeyModal } from './CreateApiKeyModal';
import styles from './SettingsCards.module.css';

/**
 * Tarjeta de gestión de API Keys (exclusiva para administradores).
 * Permite listar llaves de acceso externas, generar nuevos tokens y revocar credenciales comprometidas.
 */
export const ApiKeysManagerCard: React.FC = () => {
  const { showToast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Carga la lista actualizada de API Keys desde el backend.
   */
  const loadKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiKeysService.listApiKeys();
      setKeys(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al listar API Keys';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    apiKeysService
      .listApiKeys()
      .then((data) => {
        if (active) setKeys(data);
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Error al listar API Keys';
          showToast(msg, 'error');
        }
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  /**
   * Revoca una API Key existente tras confirmación del usuario.
   */
  const handleRevokeKey = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas revocar permanentemente la API Key "${name}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await apiKeysService.deleteApiKey(id);
      showToast(`API Key "${name}" revocada exitosamente`, 'success');
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al revocar API Key';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.card} data-testid="api-keys-manager-card">
      <div className={styles.cardHeader}>
        <div className={`${styles.cardIcon} ${styles.cardIconPurple}`}>
          <Key size={20} />
        </div>
        <div className={styles.cardHeaderTexts} style={{ flex: 1 }}>
          <h2 className={styles.cardTitle}>Gestión de API Keys</h2>
          <span className={styles.cardSubtitle}>
            Tokens de acceso programático de alta velocidad para integraciones externas y SDKs.
          </span>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={15} />
          <span>Nueva API Key</span>
        </Button>
      </div>

      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando API Keys...
        </div>
      ) : keys.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          No hay API Keys generadas. Crea una para habilitar integraciones externas con el backend.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.8125rem',
              color: 'var(--text-main)',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>Nombre</th>
                <th style={{ padding: '10px 8px' }}>Prefijo / Hash</th>
                <th style={{ padding: '10px 8px' }}>Rate Limit</th>
                <th style={{ padding: '10px 8px' }}>Último Uso</th>
                <th style={{ padding: '10px 8px' }}>Creada</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr
                  key={k.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{k.name}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <code
                      style={{
                        background: 'var(--bg-input)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {k.keyPrefix}••••••••
                    </code>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={13} style={{ color: 'var(--accent-primary)' }} />
                      {k.rateLimit ?? 100} req/min
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Nunca'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => void handleRevokeKey(k.id, k.name)}
                      disabled={deletingId === k.id}
                      aria-label={`Revocar llave ${k.name}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-danger, #ef4444)',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '4px',
                      }}
                      title="Revocar API Key permanentemente"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.08)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.75rem',
          color: 'var(--color-danger, #ef4444)',
        }}
      >
        <ShieldAlert size={16} style={{ flexShrink: 0 }} />
        <span>
          Las API Keys tienen acceso equivalente al rol que las crea. Si sospechas que un token se
          ha filtrado, revócalo de inmediato.
        </span>
      </div>

      <CreateApiKeyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onKeyCreated={() => void loadKeys()}
      />
    </div>
  );
};

