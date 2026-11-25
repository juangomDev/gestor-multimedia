import { apiClient } from './apiClient';
import type {
  ApiChatAnswer,
  ApiChatAskInput,
  ApiChatSuggestionsResponse,
} from '../types/api';
import type {
  ChatSource,
  ChatChartData,
  ChatResponse,
  ChatMessage,
} from '../types/chat';

export type { ChatSource, ChatChartData, ChatResponse, ChatMessage };

/**
 * Servicio sin estado de comunicación con el motor Data Chat RAG (`monolith-backend` Fase 21).
 * Cubre consultas internas con RBAC, sugerencias públicas, sandbox público e indicador `usedAi`.
 */
export class ChatService {
  /**
   * Construye el payload validado para `POST /api/v1/chat/ask` o `POST /api/v1/public/chat/ask`.
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
   * Normaliza la respuesta del servidor garantizando `usedAi: boolean`, `sources` y `chartData`.
   */
  private normalizeResponse(raw: Partial<ApiChatAnswer> | null | undefined): ChatResponse {
    return {
      answer: raw?.answer || 'No se recibió respuesta del asistente analítico.',
      foundInSystem: raw?.foundInSystem ?? false,
      usedAi: Boolean(raw?.usedAi),
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
   * Realiza una consulta analítica autenticada con control RBAC (`POST /api/v1/chat/ask`).
   *
   * @param question Pregunta analítica en lenguaje natural.
   * @param folderId UUID opcional de carpeta para acotar el alcance.
   * @param shortCode ShortCode opcional para consultar una única tabla o documento.
   * @returns Respuesta normalizada incluyendo `usedAi: boolean`, fuentes y gráfico opcional.
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
   * Obtiene preguntas sugeridas dinámicas respetando los permisos RBAC del usuario autenticado
   * (`GET /api/v1/chat/suggestions`).
   *
   * @param folderId UUID opcional de carpeta para acotar las sugerencias.
   * @returns Lista de preguntas sugeridas sobre tablas y PDFs accesibles al usuario.
   */
  async getInternalSuggestions(folderId?: string | null): Promise<string[]> {
    const params = new URLSearchParams();
    if (folderId && folderId.trim()) {
      params.set('folderId', folderId.trim());
    }
    const qs = params.toString();
    const endpoint = qs ? `/api/v1/chat/suggestions?${qs}` : '/api/v1/chat/suggestions';

    const res = await apiClient.get<ApiChatSuggestionsResponse>(endpoint);
    return Array.isArray(res?.suggestions) ? res.suggestions : [];
  }

  /**
   * Obtiene preguntas sugeridas dinámicas generadas a partir de recursos públicos
   * (`GET /api/v1/public/chat/suggestions`).
   *
   * @param folderId UUID opcional de carpeta pública.
   * @returns Lista de preguntas sugeridas.
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
   * restringida a carpetas compartidas con `ai_manager` (con rate-limit e indicador `usedAi`).
   *
   * @param question Pregunta en lenguaje natural.
   * @param folderId UUID opcional de carpeta pública.
   * @param shortCode ShortCode opcional de recurso público.
   * @returns Respuesta normalizada incluyendo `usedAi: boolean`, citas y gráfico opcional.
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

/** Instancia singleton del servicio de Data Chat RAG. */
export const chatService = new ChatService();
