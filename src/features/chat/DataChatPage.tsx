import React, { useContext, useEffect, useRef, useState, useTransition } from 'react';
import { Globe, Loader2, Send, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/useToast';
import { useChatSuggestionsQuery } from '../../queries/useChatQueries';
import { chatService } from '../../services/chatService';
import { ShellContext } from '../shell/shellContextDef';
import { NotificationBell } from '../notifications/NotificationBell';
import { ChatScopeBar, type ChatScopeMode } from './ChatScopeBar';
import { ChatMessageBubble } from './ChatMessageBubble';
import { PublicWidgetDrawer } from './PublicWidgetDrawer';
import {
  createAssistantChatMessage,
  createUserChatMessage,
  normalizeShortCodeInput,
} from './chatHelpers';
import type { ChatMessage } from '../../types/chat';
import styles from './DataChatPage.module.css';

/**
 * Vista de Consulta Inteligente / Data Chat RAG (`/chat`), cargada con `React.lazy`.
 * Permite acotar consultas por espacio, carpeta o recurso, usar chips de sugerencias
 * (`GET /api/v1/public/chat/suggestions`), visualizar trazabilidad `usedAi`, citas clicables
 * por página, gráficos de barras (`chartData`) y abrir el cajón de **Widget Público**.
 */
export const DataChatPage: React.FC = () => {
  const { showToast } = useToast();
  const shell = useContext(ShellContext);
  const [isPendingTransition, startTransition] = useTransition();

  const [scopeMode, setScopeMode] = useState<ChatScopeMode>('all');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [selectedShortCode, setSelectedShortCode] = useState('');
  const [draft, setDraft] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const threadRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = threadRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length, isAsking]);

  const folders = shell?.allFolders ?? [];
  const activeFolderId = scopeMode === 'folder' && selectedFolderId ? selectedFolderId : null;
  const activeShortCode =
    scopeMode === 'resource' ? normalizeShortCodeInput(selectedShortCode) || null : null;

  const suggestionsQuery = useChatSuggestionsQuery(activeFolderId);
  const suggestions = suggestionsQuery.data ?? [];

  const getContextLabel = (): string => {
    if (scopeMode === 'folder' && activeFolderId) {
      const found = folders.find((f) => f.id === activeFolderId);
      return found ? `Carpeta: ${found.name}` : 'Carpeta específica';
    }
    if (scopeMode === 'resource' && activeShortCode) {
      return `Recurso: ${activeShortCode}`;
    }
    return 'Todo mi espacio';
  };

  const handleSubmitQuestion = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isAsking) return;

    if (scopeMode === 'folder' && !activeFolderId) {
      showToast('Selecciona una carpeta específica antes de enviar la consulta.', 'warning');
      return;
    }
    if (scopeMode === 'resource' && !activeShortCode) {
      showToast('Selecciona o escribe un shortCode antes de consultar.', 'warning');
      return;
    }

    const userMessage = createUserChatMessage(trimmed, getContextLabel());

    setDraft('');
    setIsAsking(true);
    startTransition(() => {
      setMessages((prev) => [...prev, userMessage]);
    });

    try {
      const res = await chatService.askInternal(trimmed, activeFolderId, activeShortCode);
      const assistantMessage = createAssistantChatMessage(res);
      startTransition(() => {
        setMessages((prev) => [...prev, assistantMessage]);
      });
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo procesar la consulta.';
      showToast(detail || fallback, 'error');
    } finally {
      setIsAsking(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmitQuestion(draft);
    }
  };

  return (
    <div className={styles.page} data-testid="data-chat-page">
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <h1 className={styles.title}>Data Chat</h1>
          <p className={styles.subtitle}>
            Consultas analíticas sobre tablas y PDFs con trazabilidad de origen{' '}
            <code>usedAi</code> y citas directas.
          </p>
        </div>

        <div className={styles.headerActions}>
          {messages.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={() => setMessages([])}
            >
              Limpiar hilo
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            icon={<Globe size={14} />}
            onClick={() => setWidgetOpen(true)}
            data-testid="open-public-widget-btn"
          >
            Widget Público
          </Button>
          <NotificationBell />
        </div>
      </header>

      <ChatScopeBar
        mode={scopeMode}
        onModeChange={setScopeMode}
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolderId={setSelectedFolderId}
        selectedShortCode={selectedShortCode}
        onSelectShortCode={setSelectedShortCode}
      />

      <section ref={threadRef} className={styles.thread} aria-label="Conversación de Data Chat">
        {messages.length === 0 ? (
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeHeader}>
              <h2 className={styles.welcomeTitle}>Pregunta a tus datasets y documentos PDF</h2>
              <p className={styles.welcomeDesc}>
                Cada respuesta indica explícitamente si fue generada por IA o resuelta
                directamente por el sistema, con enlaces clicables a tablas y páginas exactas de
                PDF.
              </p>
            </div>

            <div className={styles.suggestionsBlock}>
              <span className={styles.suggestionsLabel}>Sugerencias rápidas</span>
              {suggestionsQuery.isLoading ? (
                <Skeleton variant="line" height={32} />
              ) : suggestions.length > 0 ? (
                <div className={styles.suggestionsWrap} data-testid="chat-suggestions">
                  {suggestions.map((text) => (
                    <button
                      key={text}
                      type="button"
                      className={styles.suggestionChip}
                      onClick={() => void handleSubmitQuestion(text)}
                    >
                      <Sparkles size={11} aria-hidden="true" /> {text}
                    </button>
                  ))}
                </div>
              ) : (
                <span className={styles.composerHint}>
                  Escribe una pregunta abajo para consultar tus tablas `.csv/.xlsx/.json` y PDFs.
                </span>
              )}
            </div>
          </div>
        ) : (
          messages.map((msg) => <ChatMessageBubble key={msg.id} message={msg} />)
        )}

        {isAsking || isPendingTransition ? (
          <div className={styles.loadingBubble} role="status" data-testid="chat-loading-indicator">
            <Loader2 size={14} aria-hidden="true" />
            <span>Consultando fuentes y sintetizando respuesta...</span>
          </div>
        ) : null}
      </section>

      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmitQuestion(draft);
        }}
      >
        <textarea
          className={styles.composerInput}
          placeholder="Pregunta sobre cifras, comparativas o cláusulas en tus PDFs..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          aria-label="Escribe tu consulta para Data Chat"
          data-testid="chat-composer-input"
        />
        <div className={styles.composerFooter}>
          <span className={styles.composerHint}>
            Alcance activo: <strong>{getContextLabel()}</strong> · Enter para enviar
          </span>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={<Send size={14} />}
            loading={isAsking}
            disabled={!draft.trim()}
            data-testid="chat-send-btn"
          >
            Consultar
          </Button>
        </div>
      </form>

      <PublicWidgetDrawer open={widgetOpen} onOpenChange={setWidgetOpen} folders={folders} />
    </div>
  );
};

export default DataChatPage;
