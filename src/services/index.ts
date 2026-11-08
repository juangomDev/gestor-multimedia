/**
 * Barril de exportación centralizado para la capa de servicios de gestor-multimedia.
 */
export { apiClient, ApiClient, ApiError } from './apiClient';
export type { RequestOptions } from './apiClient';

export { authService, AuthService } from './authService';
export { usersService, UsersService } from './usersService';
export { foldersService, FoldersService } from './foldersService';
export { healthService, HealthService } from './healthService';
export { imagesService, ImagesService } from './imagesService';
export { tablesService, TablesService } from './tablesService';
export { bulkService, BulkService } from './bulkService';
export { auditService, AuditService } from './auditService';
export { apiKeysService, ApiKeysService } from './apiKeysService';
export { storageStatsService, StorageStatsService } from './storageStatsService';
export { pdfsService, PdfsService } from './pdfsService';
export { storageService, DEFAULT_CONFIG } from './storageService';
