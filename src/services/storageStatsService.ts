import { apiClient } from './apiClient';

/**
 * Estadísticas de volumen y archivos almacenados en la base de datos PostgreSQL.
 */
export interface DatabaseStorageStats {
  images?: { count?: number; sizeBytes?: number };
  tables?: { count?: number; sizeBytes?: number };
  pdfs?: { count?: number; sizeBytes?: number };
  totalCount?: number;
  totalSizeBytes?: number;
}

/**
 * Métricas de uso real en el volumen persistente de disco físico (`./storage`).
 */
export interface DiskStorageStats {
  imagesBytes?: number;
  imagesFilesCount?: number;
  tablesBytes?: number;
  tablesFilesCount?: number;
  pdfsBytes?: number;
  pdfsFilesCount?: number;
  totalBytes?: number;
  totalFilesCount?: number;
  /** Cuota máxima configurada en bytes del volumen de almacenamiento. */
  maxStorageBytes?: number;
  /** Porcentaje ocupado del volumen físico respecto a `maxStorageBytes`. */
  usagePercent?: number;
}

/**
 * Resumen operativo consolidado del espacio devuelto por `GET /api/v1/stats/storage`.
 */
export interface OperationalStorageSummary {
  activeUsersCount?: number;
  formsCount?: number;
  pendingEntriesCount?: number;
  resolvedEntriesCount?: number;
}

/**
 * Desglose de ocupación por carpeta o proyecto.
 */
export interface FolderStorageStats {
  id?: string;
  name?: string;
  type?: string;
  totalBytes?: number;
  itemsCount?: number;
}

/**
 * Respuesta completa devuelta por `GET /api/v1/stats/storage`.
 */
export interface StorageStatsResponse {
  isAdmin: boolean;
  database: DatabaseStorageStats;
  disk?: DiskStorageStats | null;
  topFolders: FolderStorageStats[];
  /** Resumen operativo global/alcance (usuarios activos, formularios y entradas). */
  summary?: OperationalStorageSummary;
  /** Bandera preventiva activada por el backend cuando el espacio físico es crítico. */
  warning?: boolean;
  /** Mensaje descriptivo de alerta de disco cuando `warning` es `true`. */
  warningMessage?: string | null;
}

/**
 * Servicio sin estado para consultar el monitor de almacenamiento, cuotas y salud del disco
 * (`GET /api/v1/stats/storage`).
 */
export class StorageStatsService {
  /**
   * Obtiene las métricas consolidadas de almacenamiento físico y lógico.
   *
   * @returns Datos de cuotas de disco, pesos por tipo y desglose por carpetas.
   */
  async fetchStorageStats(): Promise<StorageStatsResponse> {
    return apiClient.get<StorageStatsResponse>('/api/v1/stats/storage');
  }
}

/** Instancia singleton del servicio de estadísticas de almacenamiento. */
export const storageStatsService = new StorageStatsService();
