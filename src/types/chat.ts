import type { ApiChatAnswer } from './api';

/**
 * Fuente documental citada por el motor RAG tabular o PDF en una respuesta analítica.
 */
export interface ChatSource {
  tableId?: string;
  tableName?: string;
  pdfId?: string;
  pdfName?: string;
  type?: string;
  resourceType?: string;
  kind?: string;
  shortCode: string;
  title?: string;
  pages?: number[];
}

/**
 * Estructura de datos numéricos pre-calculados por el backend para visualización gráfica.
 */
export type ChatChartData = NonNullable<ApiChatAnswer['chartData']>;

/**
 * Respuesta normalizada de una consulta analítica al motor RAG (Fase 21).
 * Incluye el indicador explícito `usedAi: boolean` devuelto por `/api/v1/chat/ask`
 * y `/api/v1/public/chat/ask`.
 */
export interface ChatResponse {
  answer: string;
  foundInSystem: boolean;
  /** Indica si la respuesta fue sintetizada por un LLM (`true`) o respondida directamente por el sistema (`false`). */
  usedAi: boolean;
  sources: ChatSource[];
  chartData: ChatChartData | null;
}

/**
 * Mensaje individual dentro del hilo de conversación del Asistente Analítico (Data Chat).
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  foundInSystem?: boolean;
  /** Insignia de procedencia de respuesta (Fase 21). */
  usedAi?: boolean;
  sources?: ChatSource[];
  chartData?: ChatChartData | null;
  contextLabel?: string;
}
