import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formsService } from '../services/formsService';
import { notificationsService } from '../services/notificationsService';
import type {
  CreateFormInput,
  ListEntriesOptions,
  ResolveEntryInput,
} from '../types/forms';
import type {
  FormSubscriptionPreferences,
  FormSubscriptionStatusResponse,
} from '../types/notifications';
import { queryKeys } from './queryKeys';

/**
 * Lista todas las definiciones de formularios accesibles (`GET /api/v1/forms`).
 * Incluye `_count.entries` sin generar consultas N+1.
 */
export function useFormsListQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.forms.list(),
    queryFn: () => formsService.listForms(),
    enabled,
  });
}

/**
 * Obtiene el detalle de un formulario por UUID o slug (`GET /api/v1/forms/:idOrSlug`).
 */
export function useFormDetailQuery(idOrSlug: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.forms.detail(idOrSlug || ''),
    queryFn: () => formsService.getForm(idOrSlug!),
    enabled: Boolean(idOrSlug),
  });
}

/**
 * Lista las entradas de un formulario con filtro mensual, estado y paginación
 * (`GET /api/v1/forms/:formId/entries`).
 */
export function useFormEntriesQuery(
  formId: string | null | undefined,
  options: ListEntriesOptions = {}
) {
  return useQuery({
    queryKey: queryKeys.forms.entries(formId || '', options),
    queryFn: () => formsService.listEntries(formId!, options),
    enabled: Boolean(formId),
  });
}

/**
 * Consulta el estado actual de suscripción a notificaciones de un formulario
 * (`GET /api/v1/forms/:formId/subscription`).
 */
export function useFormSubscriptionQuery(formId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.forms.subscription(formId || ''),
    queryFn: () => notificationsService.getFormSubscription(formId!),
    enabled: Boolean(formId),
  });
}

/**
 * Mutación para crear un nuevo formulario dinámico (`POST /api/v1/forms`).
 * Invalida en paralelo formularios, tablas vinculadas y carpetas.
 */
export function useCreateFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFormInput) => formsService.createForm(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.forms.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tables.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.all }),
      ]);
    },
  });
}

/**
 * Mutación Write-Once para sellar el dictamen de una entrada (`PATCH /api/v1/forms/entries/:id/resolve`).
 */
export function useResolveFormEntryMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: ResolveEntryInput }) =>
      formsService.resolveEntry(entryId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['forms', 'entries', formId] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.forms.detail(formId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.forms.list() }),
      ]);
    },
  });
}

/**
 * Mutación para reenviar bajo demanda una entrada sellada hacia `externalTargetUrl`
 * (`POST /api/v1/forms/entries/:id/dispatch`).
 */
export function useDispatchFormEntryMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => formsService.dispatchEntry(entryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['forms', 'entries', formId] });
    },
  });
}

/**
 * Mutación para suscribirse o actualizar preferencias de alerta de un formulario
 * (`POST /api/v1/forms/:id/subscribe`).
 */
export function useSubscribeFormMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: FormSubscriptionPreferences) =>
      notificationsService.subscribeToForm(formId, prefs),
    onSuccess: (subscription) => {
      queryClient.setQueryData<FormSubscriptionStatusResponse>(
        queryKeys.forms.subscription(formId),
        { subscribed: true, subscription }
      );
    },
  });
}

/**
 * Mutación para cancelar la suscripción a alertas de un formulario
 * (`DELETE /api/v1/forms/:id/subscribe`).
 */
export function useUnsubscribeFormMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.unsubscribeFromForm(formId),
    onSuccess: () => {
      queryClient.setQueryData<FormSubscriptionStatusResponse>(
        queryKeys.forms.subscription(formId),
        { subscribed: false, subscription: null }
      );
    },
  });
}
