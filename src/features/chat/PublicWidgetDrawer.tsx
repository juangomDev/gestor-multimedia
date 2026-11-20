import React, { useState, useTransition } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { Check, Code2, Copy, Globe, Send, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { useToast } from '../../context/useToast';
import { chatService } from '../../services/chatService';
import { storageService } from '../../services/storageService';
import { ApiError } from '../../services/http/apiError';
import { copyToClipboard } from '../../utils/clipboard';
import { ChatMessageBubble } from './ChatMessageBubble';
import {
  buildWidgetHtmlSnippet,
  buildWidgetReactSnippet,
  createAssistantChatMessage,
  createUserChatMessage,
} from './chatHelpers';
import type { ChatMessage } from '../../types/chat';
import type { FolderItem } from '../../types/media';
import styles from './PublicWidgetDrawer.module.css';

/**
 * Propiedades del cajón lateral del Widget Público RAG (`PublicWidgetDrawer`).
 */
export interface PublicWidgetDrawerProps {
  /** Controla la visibilidad del drawer. */
  open: boolean;
  /** Callback al cerrar el drawer. */
  onOpenChange: (open: boolean) => void;
  /** Lista de carpetas del espacio para filtrar opcionalmente el sandbox/snippet. */
  folders: FolderItem[];
}

/**
 * Cajón accesible (`@radix-ui/react-dialog`) con probador en vivo contra el endpoint público
 * `POST /api/v1/public/chat/ask` (mostrando insignia `usedAi`, citas y gráficos) y generador
 * de snippets **HTML** / **React** listos para incrustar en sitios externos.
 */
export const PublicWidgetDrawer: React.FC<PublicWidgetDrawerProps> = ({
  open,
  onOpenChange,
  folders,
}) => {
  const { showToast } = useToast();
  const [isPendingTransition, startTransition] = useTransition();

  const [tab, setTab] = useState<'sandbox' | 'embed'>('sandbox');
  const [snippetKind, setSnippetKind] = useState<'html' | 'react'>('html');
  const [folderId, setFolderId] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copied, setCopied] = useState(false);

  const baseUrl = storageService.getApiBaseUrl();
  const snippet =
    snippetKind === 'html'
      ? buildWidgetHtmlSnippet(baseUrl, folderId || null)
      : buildWidgetReactSnippet(baseUrl, folderId || null);

  const selectableFolders = folders.filter((f) => !f.isSystem && f.type !== 'image');

  const handleAskPublic = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

    const userMsg = createUserChatMessage(trimmed, undefined, 'pub-u');

    setQuestion('');
    setErrorMsg(null);
    setIsAsking(true);
    startTransition(() => {
      setMessages((prev) => [...prev, userMsg]);
    });

    try {
      const response = await chatService.askPublic(trimmed, folderId || null);
      const assistantMsg = createAssistantChatMessage(response, 'pub-a');
      startTransition(() => {
        setMessages((prev) => [...prev, assistantMsg]);
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429) {
        setErrorMsg('Límite de consultas públicas alcanzado (429). Intenta de nuevo en unos segundos.');
      } else {
        const detail = (err as { detail?: string })?.detail;
        const fallback = err instanceof Error ? err.message : 'No se pudo consultar el widget público.';
        setErrorMsg(detail || fallback);
      }
    } finally {
      setIsAsking(false);
    }
  };

  const handleCopySnippet = async () => {
    const ok = await copyToClipboard(snippet);
    if (ok) {
      setCopied(true);
      showToast('Snippet del widget público copiado al portapapeles.', 'success');
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      showToast('No se pudo copiar el snippet.', 'error');
    }
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content className={styles.drawer} data-testid="public-widget-drawer">
          <div className={styles.header}>
            <div className={styles.headingGroup}>
              <RadixDialog.Title className={styles.title}>
                Widget Público de Chat Web
              </RadixDialog.Title>
              <RadixDialog.Description className={styles.description}>
                Prueba respuestas sin sesión contra <code>POST /api/v1/public/chat/ask</code> y
                copia el código para tu sitio web.
              </RadixDialog.Description>
            </div>
            <RadixDialog.Close className={styles.closeBtn} aria-label="Cerrar cajón de widget">
              <X size={16} />
            </RadixDialog.Close>
          </div>

          <div className={styles.body}>
            <div className={styles.infoBanner}>
              El widget público solo accede a carpetas compartidas con{' '}
              <code>ai_manager</code> (permiso <code>READ</code>). Actívalo desde el menú{' '}
              <strong>Compartir</strong> de cada carpeta.
            </div>

            <div className={styles.selectRow}>
              <label htmlFor="public-widget-folder" className={styles.label}>
                Carpeta pública opcional
              </label>
              <select
                id="public-widget-folder"
                className={styles.select}
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                <option value="">Todas las carpetas publicadas en ai_manager</option>
                {selectableFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as 'sandbox' | 'embed')}>
              <TabsList>
                <TabsTrigger value="sandbox">
                  <Globe size={13} aria-hidden="true" /> Probador en vivo
                </TabsTrigger>
                <TabsTrigger value="embed">
                  <Code2 size={13} aria-hidden="true" /> Incrustar HTML / React
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sandbox">
                <form className={styles.askForm} onSubmit={(e) => void handleAskPublic(e)}>
                  <div className={styles.inputGrow}>
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Prueba una consulta pública..."
                      aria-label="Pregunta para el probador público"
                      data-testid="public-widget-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    icon={<Send size={14} />}
                    loading={isAsking || isPendingTransition}
                    disabled={!question.trim()}
                    data-testid="public-widget-send-btn"
                  >
                    Probar
                  </Button>
                </form>

                {errorMsg ? (
                  <div className={styles.errorBox} role="alert" data-testid="public-widget-error">
                    {errorMsg}
                  </div>
                ) : null}

                <div className={styles.messagesList} data-testid="public-widget-messages">
                  {messages.map((msg) => (
                    <ChatMessageBubble
                      key={msg.id}
                      message={msg}
                      onSourceOpened={() => onOpenChange(false)}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="embed">
                <div className={styles.snippetToolbar}>
                  <div className={styles.formatToggle} role="group" aria-label="Formato de snippet">
                    <button
                      type="button"
                      className={`${styles.formatBtn} ${
                        snippetKind === 'html' ? styles.formatBtnActive : ''
                      }`}
                      onClick={() => setSnippetKind('html')}
                    >
                      HTML + JS
                    </button>
                    <button
                      type="button"
                      className={`${styles.formatBtn} ${
                        snippetKind === 'react' ? styles.formatBtnActive : ''
                      }`}
                      onClick={() => setSnippetKind('react')}
                    >
                      React (TSX)
                    </button>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={copied ? <Check size={13} /> : <Copy size={13} />}
                    onClick={() => void handleCopySnippet()}
                    data-testid="public-widget-copy-btn"
                  >
                    {copied ? 'Copiado' : 'Copiar código'}
                  </Button>
                </div>

                <pre className={styles.codeBlock} data-testid="public-widget-snippet">
                  <code>{snippet}</code>
                </pre>
              </TabsContent>
            </Tabs>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
