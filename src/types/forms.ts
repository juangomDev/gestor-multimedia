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
  /** Esquema de campos para la carga pública o inicial */
  entryFieldsSchema: FormSchemaField[];
  /** Esquema de campos exclusivos para la resolución interna */
  resolutionFieldsSchema: FormSchemaField[];
  /** Estados de resolución permitidos (por defecto ['VALID', 'INVALID']) */
  allowedResolutionStates: string[];
  /** URL webhook opcional para despachar automáticamente o a demanda el registro sellado */
  externalTargetUrl?: string | null;
  /** Total de respuestas/entradas registradas */
  entriesCount?: number;
  /** Fecha de creación en formato ISO 8601 */
  createdAt: string;
  /** Fecha de última actualización */
  updatedAt?: string;
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

