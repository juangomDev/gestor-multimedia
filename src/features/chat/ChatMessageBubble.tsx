import React from 'react';
import { Database, Sparkles } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';
import { ChatBarChart } from './ChatBarChart';
import { ChatSourcesList } from './ChatSourcesList';
import type { ChatMessage } from '../../types/chat';
import styles from './ChatMessageBubble.module.css';

/**
 * Propiedades de la burbuja editorial de conversación (`ChatMessageBubble`).
 */
export interface ChatMessageBubbleProps {
  /** Mensaje de usuario o respuesta analítica del asistente RAG. */
  message: ChatMessage;
  /** Callback opcional reenviado al abrir una cita documental. */
  onSourceOpened?: () => void;
}

/**
 * Burbuja de mensaje del Asistente Analítico (Data Chat):
 * muestra la **insignia explícita de origen `usedAi` (Fase 21)** ("Generado con IA" cuando
 * `usedAi: true` vs "Respuesta directa del sistema" cuando `usedAi: false`),
 * gráfico numérico opcional (`ChatBarChart`) y citas clicables (`ChatSourcesList`).
 */
export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  onSourceOpened,
}) => {
  if (message.role === 'user') {
    return (
      <article className={`${styles.row} ${styles.rowUser}`} data-testid={`chat-msg-${message.id}`}>
        <div className={styles.userBubble}>
          {message.contextLabel ? (
            <span className={styles.contextPill}>{message.contextLabel}</span>
          ) : null}
          <p className={styles.content}>{message.content}</p>
          <span className={styles.timestamp}>{formatDate(message.timestamp)}</span>
        </div>
      </article>
    );
  }

  const usedAi = Boolean(message.usedAi);

  return (
    <article
      className={`${styles.row} ${styles.rowAssistant}`}
      data-testid={`chat-msg-${message.id}`}
    >
      <div className={`${styles.assistantBubble} ${usedAi ? styles.assistantAi : ''}`}>
        <div className={styles.metaHeader}>
          <div className={styles.badgeGroup}>
            <Badge
              tone={usedAi ? 'accent' : 'neutral'}
              className={styles.originBadge}
              title={
                usedAi
                  ? 'Respuesta sintetizada con modelo de IA sobre tus datos'
                  : 'Respuesta generada directamente por el motor determinista sin invocar LLM'
              }
            >
              {usedAi ? (
                <Sparkles size={11} aria-hidden="true" />
              ) : (
                <Database size={11} aria-hidden="true" />
              )}
              <span data-testid="chat-used-ai-badge">
                {usedAi ? 'Generado con IA' : 'Respuesta directa del sistema'}
              </span>
            </Badge>

            {message.foundInSystem === false ? (
              <Badge tone="warn">Sin coincidencia en archivo</Badge>
            ) : null}
          </div>

          <span className={styles.timestamp}>{formatDate(message.timestamp)}</span>
        </div>

        <p className={styles.content}>{message.content}</p>

        {message.chartData ? <ChatBarChart chartData={message.chartData} /> : null}

        {message.sources && message.sources.length > 0 ? (
          <ChatSourcesList sources={message.sources} onSourceOpened={onSourceOpened} />
        ) : null}
      </div>
    </article>
  );
};
