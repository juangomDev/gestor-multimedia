import React from 'react';
import { Shield, Clock, User, Globe, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/useToast';
import type { AuditLogItem } from '../../services/auditService';

/**
 * Propiedades del modal de inspección de detalles de un evento de auditoría.
 */
export interface AuditDetailModalProps {
  log: AuditLogItem | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal para visualizar el desglose técnico y metadatos JSON completos de un evento registrado en `AuditLog`.
 */
export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({ log, isOpen, onClose }) => {
  const { showToast } = useToast();
  if (!isOpen || !log) return null;

  const formattedJson = log.metadata ? JSON.stringify(log.metadata, null, 2) : '{}';

  const handleCopyJson = async () => {
    const ok = await copyToClipboard(formattedJson);
    showToast(ok ? 'Metadatos copiados al portapapeles' : 'No se pudo copiar', ok ? 'success' : 'error');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalles de Auditoría — ${log.action}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            background: 'var(--bg-panel)',
            padding: 12,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={15} style={{ color: 'var(--accent-primary)' }} />
            <span>
              <strong>Actor:</strong> {log.actorUsername}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={15} style={{ color: 'var(--color-success)' }} />
            <span>
              <strong>Recurso:</strong> {log.resourceType} ({log.resourceId || 'N/A'})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={15} style={{ color: 'var(--accent-purple, #a855f7)' }} />
            <span>
              <strong>IP Origen:</strong> {log.ipAddress || '127.0.0.1'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={15} style={{ color: 'var(--text-muted)' }} />
            <span>
              <strong>Fecha:</strong> {new Date(log.createdAt).toLocaleString('es-ES')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              METADATOS DEL EVENTO (JSON)
            </span>
            {log.metadata && (
              <button
                type="button"
                onClick={handleCopyJson}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Check size={12} />
                <span>Copiar JSON</span>
              </button>
            )}
          </div>

          <pre
            style={{
              maxHeight: 220,
              overflow: 'auto',
              margin: 0,
              padding: 12,
              background: 'var(--bg-code, #0b1120)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.75rem',
              color: 'var(--text-main)',
              lineHeight: 1.5,
            }}
          >
            {formattedJson}
          </pre>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

