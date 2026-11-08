import { apiClient } from './apiClient';
import type {
  ApiChatAnswer,
  ApiChatAskInput,
  ApiChatSuggestionsResponse,
} from '../types/api';

/**
 * Fuente documental citada por el motor RAG tabular o documental en una respuesta analítica.
 */
export interface ChatSource {
  tableId?: string;
  tableName?: string;
  pdfId?: string;
  pdfName?: string;
  shortCode: string;
  title?: string;
  pages?: number[];
}

/**
 * Estructura de datos numéricos pre-calculados por el backend para visualización gráfica.
 */
export type ChatChartData = NonNullable<ApiChatAnswer['chartData']>;

/**
 * Respuesta normalizada de una consulta analítica al motor RAG tabular.
 */
export type ChatResponse = ApiChatAnswer;

/**
 * Mensaje individual dentro del hilo de conversación del Asistente Analítico.
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  foundInSystem?: boolean;
  sources?: ChatSource[];
  chartData?: ChatChartData | null;
  contextLabel?: string;
}

/**
 * Servicio de comunicación con el motor de Asistente Analítico Inteligente (RAG Tabular)
 * de `monolith-backend`. Cubre consultas internas con RBAC, sugerencias dinámicas y sandbox público.
 */
export class ChatService {
  /**
   * Construye el payload limpio para `POST /api/v1/chat/ask` o `POST /api/v1/public/chat/ask`.
   *
   * @param question Pregunta en lenguaje natural formulada por el usuario.
   * @param folderId UUID opcional de carpeta para acotar el contexto.
   * @param shortCode Código corto opcional de una tabla específica.
   * @returns Cuerpo de petición validado.
   */
  private buildAskPayload(
    question: string,
    folderId?: string | null,
    shortCode?: string | null
  ): ApiChatAskInput {
    const trimmed = question.trim();
    if (!trimmed) {
      throw new Error('La pregunta no puede estar vacía');
    }

    const payload: ApiChatAskInput = { question: trimmed };
    if (folderId && folderId.trim()) {
      payload.folderId = folderId.trim();
    }
    if (shortCode && shortCode.trim()) {
      payload.shortCode = shortCode.trim();
    }
    return payload;
  }

  /**
   * Normaliza la respuesta del servidor garantizando arreglos seguros en `sources` y `chartData`.
   *
   * @param raw Respuesta cruda devuelta por el endpoint de chat.
   * @returns Objeto `ChatResponse` normalizado.
   */
  private normalizeResponse(raw: Partial<ApiChatAnswer> | null | undefined): ChatResponse {
    return {
      answer: raw?.answer || 'No se recibió respuesta del asistente analítico.',
      foundInSystem: raw?.foundInSystem ?? false,
      sources: Array.isArray(raw?.sources) ? raw.sources : [],
      chartData:
        raw?.chartData &&
        Array.isArray(raw.chartData.labels) &&
        raw.chartData.labels.length > 0
          ? {
              labels: raw.chartData.labels,
              values: Array.isArray(raw.chartData.values) ? raw.chartData.values : [],
              percentages: Array.isArray(raw.chartData.percentages)
                ? raw.chartData.percentages
                : [],
            }
          : null,
    };
  }

  /**
   * Realiza una consulta analítica privada autenticada con control RBAC (`POST /api/v1/chat/ask`).
   * Respeta la jerarquía de roles (ADMIN ve todas, MANAGER propias/públicas/compartidas, COLLABORATOR compartidas).
   *
   * @param question Pregunta analítica sobre los datos tabulares.
   * @param folderId UUID opcional de carpeta para filtrar el alcance.
   * @param shortCode ShortCode opcional de dataset para consultar una única tabla.
   * @returns Respuesta fundamentada con fuentes citadas y datos de gráfico opcionales.
   */
  async askInternal(
    question: string,
    folderId?: string | null,
    shortCode?: string | null
  ): Promise<ChatResponse> {
    const payload = this.buildAskPayload(question, folderId, shortCode);
    const res = await apiClient.post<ApiChatAnswer>('/api/v1/chat/ask', payload);
    return this.normalizeResponse(res);
  }

  /**
   * Obtiene la lista de preguntas recomendadas generadas a partir de las Fichas Técnicas
   * de las tablas públicas disponibles (`GET /api/v1/public/chat/suggestions`).
   *
   * @param folderId UUID opcional de carpeta pública para acotar las sugerencias.
   * @returns Arreglo de preguntas sugeridas listas para mostrar como chips interactivos.
   */
  async getPublicSuggestions(folderId?: string | null): Promise<string[]> {
    const params = new URLSearchParams();
    if (folderId && folderId.trim()) {
      params.set('folderId', folderId.trim());
    }
    const qs = params.toString();
    const endpoint = qs
      ? `/api/v1/public/chat/suggestions?${qs}`
      : '/api/v1/public/chat/suggestions';

    const res = await apiClient.get<ApiChatSuggestionsResponse>(endpoint, {
      skipAuth: true,
    });
    return Array.isArray(res?.suggestions) ? res.suggestions : [];
  }

  /**
   * Realiza una consulta analítica pública sin autenticación (`POST /api/v1/public/chat/ask`),
   * diseñada para widgets web embebidos y restringida exclusivamente a carpetas públicas (con rate-limit).
   *
   * @param question Pregunta sobre los datasets públicos.
   * @param folderId UUID opcional de carpeta pública.
   * @param shortCode ShortCode opcional de tabla pública.
   * @returns Respuesta analítica pública con fuentes y gráficos.
   */
  async askPublic(
    question: string,
    folderId?: string | null,
    shortCode?: string | null
  ): Promise<ChatResponse> {
    const payload = this.buildAskPayload(question, folderId, shortCode);
    const res = await apiClient.post<ApiChatAnswer>('/api/v1/public/chat/ask', payload, {
      skipAuth: true,
    });
    return this.normalizeResponse(res);
  }
}

export const chatService = new ChatService();

