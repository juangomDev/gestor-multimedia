import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, AlertTriangle, Code2, Trash2 } from 'lucide-react';
import {
  chatService,
  type ChatMessage,
  type ChatSource,
} from '../services/chatService';
import { ChatSourcesList } from '../components/chat/ChatSourcesList';
import { ChatChartRenderer } from '../components/chat/ChatChartRenderer';
import { PublicWidgetPreviewModal } from '../components/chat/PublicWidgetPreviewModal';
import { Button } from '../components/common/Button';
import { useToast } from '../context/useToast';
import type { FolderItem, TableItem } from '../types/media';
import styles from './ChatStudioView.module.css';

/**
 * Propiedades de la vista principal del Asistente Analítico `ChatStudioView`.
 */
export interface ChatStudioViewProps {
  folders: FolderItem[];
  tables: TableItem[];
  onOpenTableInStudio?: (table: TableItem) => void;
}

/**
 * Vista principal del Asistente Analítico Inteligente (Chat RAG Tabular).
 * Permite consultar sobre todas las tablas accesibles, por carpeta o por dataset específico,
 * mostrando sugerencias dinámicas, fuentes citadas, gráficos estadísticos y generador de widget público.
 */
export const ChatStudioView: React.FC<ChatStudioViewProps> = ({
  folders,
  tables,
  onOpenTableInStudio,
}) => {
  const { showToast } = useToast();
  const seqRef = useRef(1);
  const [scopeMode, setScopeMode] = useState<'all' | 'folder' | 'table'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedShortCode, setSelectedShortCode] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);

  const tableFolders = folders.filter((f) => f.type === 'table');

  useEffect(() => {
    let isMounted = true;
    const folderFilter = scopeMode === 'folder' && selectedFolderId ? selectedFolderId : undefined;
    chatService
      .getPublicSuggestions(folderFilter)
      .then((list) => {
        if (isMounted) setSuggestions(list);
      })
      .catch(() => {
        if (isMounted) setSuggestions([]);
      });
    return () => {
      isMounted = false;
    };
  }, [scopeMode, selectedFolderId]);

  /**
   * Envía una pregunta analítica al motor RAG tabular (`POST /api/v1/chat/ask`).
   */
  const submitQuestion = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || isAsking) return;

    const folderParam = scopeMode === 'folder' && selectedFolderId ? selectedFolderId : undefined;
    const tableParam = scopeMode === 'table' && selectedShortCode ? selectedShortCode : undefined;

    const nextUserSeq = seqRef.current++;
    const userMsg: ChatMessage = {
      id: `usr-${nextUserSeq}`,
      role: 'user',
      content: trimmed,
      timestamp: String(nextUserSeq),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsAsking(true);

    try {
      const res = await chatService.askInternal(trimmed, folderParam, tableParam);
      const nextAstSeq = seqRef.current++;
      const assistantMsg: ChatMessage = {
        id: `ast-${nextAstSeq}`,
        role: 'assistant',
        content: res.answer,
        timestamp: String(nextAstSeq),
        foundInSystem: res.foundInSystem,
        sources: res.sources,
        chartData: res.chartData,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      showToast(err?.message || 'Error al procesar la consulta analítica', 'error');
    } finally {
      setIsAsking(false);
    }
  };

  /**
   * Abre una tabla citada como fuente directamente en el Data Studio a pantalla completa.
   */
  const handleOpenSourceInStudio = (source: ChatSource) => {
    if (!onOpenTableInStudio) return;
    const existing = tables.find(
      (t) => t.shortCode.trim() === source.shortCode.trim() || t.id === source.tableId
    );
    if (existing) {
      onOpenTableInStudio(existing);
    } else {
      onOpenTableInStudio({
        id: source.tableId, shortCode: source.shortCode, tableName: source.tableName,
        rowCount: 0, sizeBytes: 0, url: `/t/${source.shortCode}`, createdAt: '',
      });
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.iconBox}>
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className={styles.title}>Consulta Inteligente — Data Chat (RAG Tabular)</h1>
            <span className={styles.subtitle}>
              Respuestas analíticas fundamentadas con control RBAC, fuentes documentales y gráficos
            </span>
          </div>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.contextSelectGroup}>
            <label htmlFor="chat-scope-select" className={styles.subtitle}>
              Contexto:
            </label>
            <select
              id="chat-scope-select"
              className={styles.select}
              value={scopeMode}
              onChange={(e) => setScopeMode(e.target.value as 'all' | 'folder' | 'table')}
              aria-label="Contexto de consulta"
            >
              <option value="all">Todas mis tablas accesibles</option>
              <option value="folder">Filtrar por carpeta específica</option>
              <option value="table">Filtrar por dataset concreto</option>
            </select>

            {scopeMode === 'folder' && (
              <select
                className={styles.select}
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                aria-label="Seleccionar carpeta para consulta"
              >
                <option value="">Selecciona una carpeta...</option>
                {tableFolders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}

            {scopeMode === 'table' && (
              <select
                className={styles.select}
                value={selectedShortCode}
                onChange={(e) => setSelectedShortCode(e.target.value)}
                aria-label="Seleccionar dataset para consulta"
              >
                <option value="">Selecciona un dataset...</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.shortCode}>
                    {String(t.metadataCard?.title || t.tableName)} ({t.shortCode})
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button type="button" variant="secondary" onClick={() => setIsWidgetModalOpen(true)}>
            <Code2 size={14} />
            <span>Widget Público</span>
          </Button>

          {messages.length > 0 && (
            <Button type="button" variant="secondary" onClick={() => setMessages([])} title="Limpiar conversación">
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </header>

      {suggestions.length > 0 && (
        <div className={styles.suggestionsBar} aria-label="Sugerencias de consulta">
          <span className={styles.suggestionsLabel}>
            <Sparkles size={12} />
            <span>Sugerencias:</span>
          </span>
          {suggestions.map((sug, idx) => (
            <button key={`${sug}-${idx}`} type="button" className={styles.suggestionChip} onClick={() => void submitQuestion(sug)}>
              {sug}
            </button>
          ))}
        </div>
      )}

      <div className={styles.messagesArea} role="log" aria-label="Hilo de conversación analítica">
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <Sparkles size={32} style={{ color: 'var(--color-primary)' }} />
            <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
              Formula una pregunta sobre tus datasets registrados
            </strong>
            <span style={{ fontSize: '0.82rem' }}>
              El asistente analizará las tablas autorizadas según tu rol y generará respuestas con
              fuentes verificables y gráficos automáticos.
            </span>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.assistantRow}`}>
              <div className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.assistantBubble}`}>
                {msg.role === 'assistant' && msg.foundInSystem === false && (
                  <div className={styles.notFoundBanner} role="status">
                    <AlertTriangle size={15} />
                    <span>
                      Dato no registrado en el sistema: no se encontraron registros que coincidan con
                      la consulta en las tablas seleccionadas.
                    </span>
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                {msg.role === 'assistant' && msg.chartData && <ChatChartRenderer chartData={msg.chartData} />}

                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <ChatSourcesList sources={msg.sources} onOpenInStudio={handleOpenSourceInStudio} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        className={styles.composerForm}
        onSubmit={(e) => {
          e.preventDefault();
          void submitQuestion(inputQuestion);
        }}
      >
        <input
          type="text"
          className={styles.composerInput}
          placeholder="Escribe tu pregunta sobre los datos (ej. ¿Cuál es la distribución por categoría?)..."
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          disabled={isAsking}
          aria-label="Pregunta analítica"
        />
        <Button
          type="submit"
          variant="primary"
          loading={isAsking}
          disabled={!inputQuestion.trim() || isAsking}
        >
          <Send size={15} />
          <span>Consultar</span>
        </Button>
      </form>

      <PublicWidgetPreviewModal
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        folders={folders}
        tables={tables}
        initialFolderId={scopeMode === 'folder' ? selectedFolderId : ''}
        initialShortCode={scopeMode === 'table' ? selectedShortCode : ''}
      />
    </div>
  );
};
