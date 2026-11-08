import React, { useState } from 'react';
import { Copy, AlertTriangle, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { apiKeysService, type ApiKeyCreatedResponse } from '../../services/apiKeysService';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/useToast';

/**
 * Propiedades del modal de generación de nuevas claves API de integración.
 */
export interface CreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyCreated?: (key: ApiKeyCreatedResponse) => void;
}

/**
 * Modal para crear una nueva API Key de integración (`POST /api/v1/api-keys`).
 * Al generarse, revela el secreto en texto plano por única vez con botón de copiado rápido.
 */
export const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyCreated,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rateLimit, setRateLimit] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreatedResponse | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setName('');
    setDescription('');
    setRateLimit(100);
    setCreatedKey(null);
    onClose();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showToast('Debes ingresar un nombre para la API Key', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiKeysService.createApiKey({
        name: cleanName,
        description: description.trim() || undefined,
        rateLimit: Number(rateLimit) || 100,
      });
      setCreatedKey(res);
      showToast('API Key creada exitosamente', 'success');
      onKeyCreated?.(res);
    } catch (err: any) {
      showToast(err?.detail || err?.message || 'Error al generar la API Key', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySecret = async () => {
    if (!createdKey?.key) return;
    const ok = await copyToClipboard(createdKey.key);
    showToast(ok ? 'API Key copiada al portapapeles' : 'Error al copiar', ok ? 'success' : 'error');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={createdKey ? 'API Key Generada con Éxito' : 'Crear Nueva API Key'}
    >
      {createdKey ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-warning, #eab308)',
              fontSize: '0.8125rem',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>
              <strong>Guarda esta clave ahora.</strong> Por razones de seguridad criptográfica, este
              secreto <strong>no se volverá a mostrar nunca más</strong>.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              LLAVE SECRETA (X-API-KEY)
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-code, #0b1120)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <code
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.85rem',
                  color: 'var(--color-success)',
                  flex: 1,
                  wordBreak: 'break-all',
                }}
              >
                {createdKey.key}
              </code>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<Copy size={14} />}
                onClick={handleCopySecret}
              >
                Copiar
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" onClick={handleReset}>
              Entendido y Guardado
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="api-key-name-input"
              style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              Nombre de la Integración *
            </label>
            <input
              id="api-key-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Webhook Dokploy, Agente ETL..."
              required
              autoFocus
              style={{
                padding: '9px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="api-key-desc-input"
              style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              Descripción (Opcional)
            </label>
            <input
              id="api-key-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Propósito o servicio autorizado"
              style={{
                padding: '9px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="api-key-rate-input"
              style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              Límite de Peticiones (req / minuto)
            </label>
            <input
              id="api-key-rate-input"
              type="number"
              min={1}
              max={10000}
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
              style={{
                padding: '9px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <Button type="button" variant="secondary" onClick={handleReset} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting || !name.trim()}
              icon={<Sparkles size={15} />}
            >
              Generar API Key
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

