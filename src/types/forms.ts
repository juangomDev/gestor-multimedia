/**
 * Tipos y contratos para el módulo de Formularios Dinámicos, Tablas Abiertas y Resolución Write-Once.
 * @module types/forms
 */

/**
 * Tipos de datos soportados para los campos dinámicos de formularios.
 */
export type FormSchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'textarea'
  | 'email';

/**
 * Definición de un campo individual en el esquema de entrada o resolución.
 */
export interface FormSchemaField {
  /** Nombre o clave del campo en el payload JSON */
  name: string;
  /** Tipo de dato del campo */
  type: FormSchemaFieldType;
  /** Etiqueta descriptiva para renderizar en la interfaz */
  label: string;
  /** Indica si el campo es de llenado obligatorio */
  required?: boolean;
  /** Opciones disponibles cuando el tipo es 'select' */
  options?: string[];
  /** Texto de ayuda o placeholder opcional */
  placeholder?: string;
}

/**
 * Estados permitidos para una resolución final inmutable.
 */
export type FormResolutionState = 'VALID' | 'INVALID';

/**
 * Estados del ciclo de vida de una entrada de formulario.
 */
export type FormEntryStatus = 'NEW' | 'VALID' | 'INVALID';

/**
 * Estructura completa de la definición de un Formulario.
 */
export interface FormDefinition {
  /** Identificador único UUID del formulario */
  id: string;
  /** Slug único amigable para URLs públicas */
  slug: string;
  /** Título del formulario */
  title: string;
  /** Descripción opcional de propósito */
  description?: string;
  /** Identificador de la carpeta tipo tabla vinculada en PostgreSQL */
  folderId?: string | null;
  /** Identificador de la tabla vinculada donde se acumulan las filas */
  linkedTableId?: string | null;
  /** Metadatos resumidos de la tabla vinculada (cuando el backend los incluye) */
  linkedTable?: {
    id?: string;
    shortCode?: string;
    tableName?: string;
  } | null;
  /** Esquema de campos para la carga pública o inicial */
  entryFieldsSchema: FormSchemaField[];
  /** Esquema de campos exclusivos para la resolución interna */
  resolutionFieldsSchema: FormSchemaField[];
  /** Estados de resolución permitidos (por defecto ['VALID', 'INVALID']) */
  allowedResolutionStates: string[];
  /** Indica si las entradas nuevas intentan resolución automática asistida por IA */
  autoResolveWithAi?: boolean;
  /** URL webhook opcional para despachar automáticamente o a demanda el registro sellado */
  externalTargetUrl?: string | null;
  /** Total de respuestas/entradas registradas */
  entriesCount?: number;
  /** Conteo anidado devuelto directamente por Prisma en `GET /api/v1/forms` */
  _count?: {
    entries?: number;
  };
  /** Fecha de creación en formato ISO 8601 */
  createdAt: string;
  /** Fecha de última actualización */
  updatedAt?: string;
}

/**
 * Parámetros opcionales de consulta para listar definiciones de formularios (`GET /api/v1/forms`).
 */
export interface FetchFormsOptions {
  folderId?: string | null;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Datos requeridos para la creación de un nuevo Formulario.
 */
export interface CreateFormInput {
  slug: string;
  title: string;
  description?: string;
  folderId?: string;
  entryFieldsSchema: FormSchemaField[];
  resolutionFieldsSchema: FormSchemaField[];
  allowedResolutionStates?: string[];
  externalTargetUrl?: string;
  /** Habilita resolución asistida automáticamente por IA cuando lo soporta el backend. */
  autoResolveWithAi?: boolean;
}

/**
 * Payload parcial para actualizar la configuración de un formulario (`PATCH /api/v1/forms/:id`).
 */
export interface UpdateFormInput {
  /** Nuevo título visible del formulario. */
  title?: string;
  /** Lista actualizada de estados de resolución permitidos. */
  allowedResolutionStates?: string[];
  /** Activa o desactiva la resolución asistida automáticamente por IA. */
  autoResolveWithAi?: boolean;
  /** URL webhook externa al sellar (`null` limpia el webhook configurado). */
  externalTargetUrl?: string | null;
}

/**
 * Resultado devuelto al eliminar un formulario y su tabla vinculada (`DELETE /api/v1/forms/:id`).
 */
export interface DeleteFormResult {
  deleted: boolean;
  id: string;
}

/**
 * Resultado devuelto al eliminar una entrada individual de formulario (`DELETE /api/v1/forms/entries/:id`),
 * incluyendo el conteo de filas removidas del artefacto `.data.json.gz` de su tabla abierta vinculada.
 */
export interface DeleteFormEntryResult {
  /** Confirmación explícita de eliminación. */
  deleted: boolean;
  /** UUID de la entrada eliminada. */
  id: string;
  /** UUID del formulario propietario de la entrada. */
  formId: string;
  /** Cantidad de filas eliminadas de la tabla abierta vinculada (puede ser >1 en maestro-detalle). */
  removedTableRows: number;
}

/**
 * Entrada registrada para un formulario específico.
 */
export interface FormEntry {
  /** Identificador único UUID de la entrada */
  id: string;
  /** Identificador del formulario al que pertenece */
  formId: string;
  /** Estado actual de la entrada */
  status: FormEntryStatus;
  /** Datos provistos por el usuario en la entrada */
  entryPayload: Record<string, unknown>;
  /** Datos provistos por el operador al resolver (inmutable una vez sellado) */
  resolutionPayload?: Record<string, unknown> | null;
  /** Fecha en la que fue resuelto */
  resolvedAt?: string | null;
  /** Usuario u operador que ejecutó la resolución */
  resolvedById?: string | null;
  /** Fecha de transmisión exitosa al webhook externo */
  dispatchedAt?: string | null;
  /** Fecha de registro de la entrada */
  createdAt: string;
  /** Fecha de actualización */
  updatedAt?: string;
}

/**
 * Opciones para filtrar y paginar las entradas de un formulario.
 */
export interface ListEntriesOptions {
  /** Filtro por mes en formato YYYY-MM */
  month?: string;
  /** Filtro por estado */
  status?: FormEntryStatus | 'ALL';
  /** Número de página (1-based) */
  page?: number;
  /** Límite de elementos por página */
  limit?: number;
}

/**
 * Parámetros para sellar una entrada con resolución inmutable.
 */
export interface ResolveEntryInput {
  /** Diccionario de valores según resolutionFieldsSchema */
  resolutionPayload: Record<string, unknown>;
  /** Estado dictaminado ('VALID' o 'INVALID') */
  status: FormResolutionState;
}

/**
 * Resultado del despacho de una entrada sellada hacia el webhook externo.
 */
export interface DispatchResult {
  dispatched: boolean;
  targetUrl: string;
  entryId: string;
  dispatchedAt: string;
}

