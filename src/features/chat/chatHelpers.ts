import { cleanBaseUrl } from '../../utils/formatters';
import type { ChatMessage, ChatResponse, ChatSource } from '../../types/chat';

let messageSeq = 0;

/**
 * Construye un mensaje de usuario con identificador único y marca temporal ISO.
 */
export function createUserChatMessage(
  content: string,
  contextLabel?: string,
  prefix: string = 'msg-u'
): ChatMessage {
  messageSeq += 1;
  return {
    id: `${prefix}-${Date.now()}-${messageSeq}`,
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
    contextLabel,
  };
}

/**
 * Construye un mensaje de asistente a partir de una respuesta normalizada del motor RAG (`usedAi`).
 */
export function createAssistantChatMessage(
  response: ChatResponse,
  prefix: string = 'msg-a'
): ChatMessage {
  messageSeq += 1;
  return {
    id: `${prefix}-${Date.now()}-${messageSeq}`,
    role: 'assistant',
    content: response.answer,
    timestamp: new Date().toISOString(),
    foundInSystem: response.foundInSystem,
    usedAi: response.usedAi,
    sources: response.sources,
    chartData: response.chartData,
  };
}

/**
 * Determina si una fuente citada por el motor RAG corresponde a un documento PDF
 * (por oposición a un dataset tabular).
 */
export function isPdfSource(source: ChatSource): boolean {
  return Boolean(
    source.pdfId || source.pdfName || (Array.isArray(source.pages) && source.pages.length > 0)
  );
}

/**
 * Obtiene la etiqueta legible de una fuente citada (`title`, `tableName`, `pdfName` o `shortCode`).
 */
export function getSourceDisplayName(source: ChatSource): string {
  return source.title || source.tableName || source.pdfName || source.shortCode;
}

/**
 * Normaliza un código corto introducido manualmente (admite prefijos `t/`, `p/` o URL parcial).
 */
export function normalizeShortCodeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const pathMatch = trimmed.match(/\/(?:t|p)\/([a-zA-Z0-9_-]+)/);
  if (pathMatch?.[1]) return pathMatch[1];
  return trimmed.replace(/^(?:t|p)\//i, '').trim();
}

/**
 * Construye el endpoint público del asistente RAG (`POST /api/v1/public/chat/ask`).
 */
export function buildPublicChatEndpoint(baseUrl: string): string {
  return `${cleanBaseUrl(baseUrl)}/api/v1/public/chat/ask`;
}

/**
 * Genera un snippet HTML + JavaScript listo para incrustar el widget público de Data Chat
 * en cualquier sitio web externo (mostrando el origen `usedAi` y fuentes).
 */
export function buildWidgetHtmlSnippet(baseUrl: string, folderId?: string | null): string {
  const endpoint = buildPublicChatEndpoint(baseUrl);
  const folderProp = folderId ? `,\n      folderId: '${folderId}'` : '';

  return `<div id="boveda-chat-widget" style="max-width:420px;font-family:sans-serif">
  <form id="boveda-chat-form">
    <input id="boveda-chat-input" type="text" placeholder="Haz una consulta..." required />
    <button type="submit">Preguntar</button>
  </form>
  <div id="boveda-chat-output"></div>
</div>
<script>
  document.getElementById('boveda-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = document.getElementById('boveda-chat-input').value.trim();
    const res = await fetch('${endpoint}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question${folderProp} }),
    });
    const data = await res.json();
    const badge = data.usedAi ? '[Generado con IA]' : '[Respuesta del sistema]';
    document.getElementById('boveda-chat-output').textContent = badge + ' ' + data.answer;
  });
</script>`;
}

/**
 * Genera un componente React (TSX) listo para copiar e incrustar el widget público RAG.
 */
export function buildWidgetReactSnippet(baseUrl: string, folderId?: string | null): string {
  const endpoint = buildPublicChatEndpoint(baseUrl);
  const folderLine = folderId ? `\n        folderId: '${folderId}',` : '';

  return `import { useState } from 'react';

export function PublicDataChatWidget() {
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState<{ answer: string; usedAi: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('${endpoint}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question,${folderLine} }),
      });
      const data = await res.json();
      setReply({ answer: data.answer, usedAi: Boolean(data.usedAi) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleAsk}>
      <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Consulta..." />
      <button type="submit" disabled={loading}>Preguntar</button>
      {reply && (
        <div>
          <small>{reply.usedAi ? 'Generado con IA' : 'Respuesta directa del sistema'}</small>
          <p>{reply.answer}</p>
        </div>
      )}
    </form>
  );
}`;
}
