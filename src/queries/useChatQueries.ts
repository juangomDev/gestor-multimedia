import { useQuery } from '@tanstack/react-query';
import { chatService } from '../services/chatService';
import { queryKeys } from './queryKeys';

/**
 * Consulta preguntas sugeridas generadas dinámicamente a partir de recursos accesibles
 * al widget público (`GET /api/v1/public/chat/suggestions`).
 *
 * @param folderId UUID opcional de carpeta para acotar las sugerencias.
 * @param enabled Habilita o difiere la ejecución de la consulta.
 */
export function useChatSuggestionsQuery(
  folderId?: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.chat.suggestions(folderId),
    queryFn: () => chatService.getPublicSuggestions(folderId),
    enabled,
    staleTime: 60_000,
  });
}
