import React, { useState } from 'react';
import { Code2, Copy, Check, Send, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ChatChartRenderer } from './ChatChartRenderer';
import { ChatSourcesList } from './ChatSourcesList';
import { chatService, type ChatResponse } from '../../services/chatService';
import { storageService } from '../../services/storageService';
import { cleanBaseUrl } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/useToast';
import type { FolderItem, TableItem } from '../../types/media';
import styles from './PublicWidgetPreviewModal.module.css';

/**
 * Propiedades del modal `PublicWidgetPreviewModal`.
 */
export interface PublicWidgetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders?: FolderItem[];
  tables?: TableItem[];
  initialFolderId?: string;
  initialShortCode?: string;
}

/**
 * Modal generador de código embebible HTML / iFrame y Sandbox interactivo en vivo
 * para probar el endpoint público `POST /api/v1/public/chat/ask` con rate-limit (30 req/min).
 */
export const PublicWidgetPreviewModal: React.FC<PublicWidgetPreviewModalProps> = ({
  isOpen,
  onClose,
  folders = [],
  tables = [],
  initialFolderId = '',
  initialShortCode = '',
}) => {
  const { showToast } = useToast();
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const [selectedShortCode, setSelectedShortCode] = useState(initialShortCode);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const baseUrl = cleanBaseUrl(storageService.getConfig().baseUrl);
  const publicFolders = folders.filter((f) => f.type === 'table' && !f.isPrivate);

  const embedParams = new URLSearchParams();
  if (selectedFolderId) embedParams.set('folderId', selectedFolderId);
  if (selectedShortCode) embedParams.set('shortCode', selectedShortCode);
  const querySuffix = embedParams.toString() ? `?${embedParams.toString()}` : '';

  const embedSnippet = `<!-- Widget Público de Consulta Analítica (Monolith RAG Tabular) -->
<iframe
  src="${baseUrl}/public/chat-widget${querySuffix}"
  data-api-ask="${baseUrl}/api/v1/public/chat/ask"
  data-api-suggestions="${baseUrl}/api/v1/public/chat/suggestions${querySuffix}"
  width="100%"
  height="520"
  style="border:1px solid #e2e8f0;border-radius:12px;"
  title="Asistente Analítico de Datos Públicos"
></iframe>`;

  /**
   * Copia el snippet HTML / iFrame al portapapeles.
   */
  const handleCopySnippet = async () => {
    const ok = await copyToClipboard(embedSnippet);
    if (ok) {
      setCopied(true);
      showToast('Snippet HTML / iFrame copiado al portapapeles', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('No se pudo copiar el snippet', 'error');
    }
  };

  /**
   * Ejecuta una consulta real contra `POST /api/v1/public/chat/ask` sin autenticación.
   */
  const handleTestPublicAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await chatService.askPublic(
        question,
        selectedFolderId || undefined,
        selectedShortCode || undefined
      );
      setResponse(res);
    } catch (err: any) {
      const status = err?.status;
      if (status === 429) {
        setErrorMsg('Límite de velocidad excedido (429 Rate Limit: máx. 30 consultas/min por IP).');
      } else {
        setErrorMsg(err?.message || 'Error al consultar el endpoint público de chat.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generador & Sandbox de Widget Público de Chat"
    >
      <div className={styles.container}>
        <div className={styles.rateLimitBanner}>
          <ShieldCheck size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span>
            Endpoint público sin credenciales (<code>POST /api/v1/public/chat/ask</code>).
            Restringido a <strong>carpetas públicas</strong> con protección Rate-Limit de{' '}
            <strong>30 req/min por IP</strong>.
          </span>
        </div>

        <div className={styles.configRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor="widget-folder-select" className={styles.label}>
              Carpeta Pública (Opcional)
            </label>
            <select
              id="widget-folder-select"
              className={styles.select}
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
            >
              <option value="">Todas las carpetas públicas</option>
              {publicFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="widget-table-select" className={styles.label}>
              Dataset Específico (Opcional)
            </label>
            <select
              id="widget-table-select"
              className={styles.select}
              value={selectedShortCode}
              onChange={(e) => setSelectedShortCode(e.target.value)}
            >
              <option value="">Todos los datasets públicos</option>
              {tables.map((tbl) => (
                <option key={tbl.id} value={tbl.shortCode}>
                  {String(tbl.metadataCard?.title || tbl.tableName)} ({tbl.shortCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.snippetBox}>
          <div className={styles.snippetHeader}>
            <span className={styles.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Code2 size={14} />
              <span>Snippet HTML / iFrame para Sitios Externos</span>
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopySnippet}
              aria-label="Copiar Snippet HTML"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copiado' : 'Copiar Snippet HTML'}</span>
            </Button>
          </div>
          <pre className={styles.codeBlock}>
            <code>{embedSnippet}</code>
          </pre>
        </div>

        <div className={styles.sandboxSection}>
          <div className={styles.sandboxTitle}>
            <span>Sandbox en Vivo — Probar Widget Público</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              POST /api/v1/public/chat/ask
            </span>
          </div>

          <form onSubmit={handleTestPublicAsk} className={styles.sandboxForm}>
            <input
              type="text"
              className={styles.sandboxInput}
              placeholder="Ej: ¿Cuál es el total registrado en las tablas públicas?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              aria-label="Pregunta de prueba para el widget público"
            />
            <Button type="submit" variant="primary" loading={loading} disabled={!question.trim()}>
              <Send size={14} />
              <span>Probar en Vivo</span>
            </Button>
          </form>

          {errorMsg && (
            <div className={styles.errorBox} role="alert">
              {errorMsg}
            </div>
          )}

          {response && (
            <div className={styles.sandboxResult} aria-label="Respuesta del sandbox público">
              {!response.foundInSystem && (
                <div className={styles.notFoundAlert}>
                  Dato no registrado en las tablas públicas del sistema.
                </div>
              )}
              <p style={{ margin: 0, lineHeight: 1.5 }}>{response.answer}</p>
              <ChatChartRenderer chartData={response.chartData} />
              <ChatSourcesList sources={response.sources} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
