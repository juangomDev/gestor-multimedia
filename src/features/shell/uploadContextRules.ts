import type { FolderItem } from '../../types/media';
import type { Role } from '../../types/auth';

/**
 * Estado calculado del botón contextual primario **"+ Subir ..."** de la barra lateral.
 */
export interface UploadButtonState {
  enabled: boolean;
  label: string;
  disabledTooltip: string | null;
}

/**
 * Evalúa la regla estricta de subida contextual: únicamente habilitada dentro de carpetas
 * tipadas (`image`, `table`, `pdf`) con permiso `EDIT` o `ADMIN` (jamás en raíz `/`, `CONTAINER` o `shared`).
 *
 * @param activeFolder Carpeta activa según la ruta `/folder/:folderId` (o `null` en raíz/otras vistas).
 * @param userRole Rol RBAC del usuario en sesión.
 * @param userId UUID del usuario autenticado.
 * @returns Etiqueta contextual, bandera `enabled` y texto de tooltip explicativo cuando está deshabilitado.
 */
export function resolveContextualUploadState(
  activeFolder: FolderItem | null,
  userRole: Role | undefined,
  userId: string | undefined
): UploadButtonState {
  if (!activeFolder) {
    return {
      enabled: false,
      label: 'Subir archivo',
      disabledTooltip:
        'Entra a una carpeta de Imágenes, Tablas o PDF con permiso de edición para subir.',
    };
  }

  if (activeFolder.isSystem) {
    return {
      enabled: false,
      label: 'Subir archivo',
      disabledTooltip: 'La bóveda compartida del sistema es de solo lectura.',
    };
  }

  if (activeFolder.type === 'container') {
    return {
      enabled: false,
      label: 'Subir archivo',
      disabledTooltip:
        'Las carpetas contenedoras solo organizan subcarpetas. Entra a una subcarpeta tipada.',
    };
  }

  const canWrite =
    userRole === 'ADMIN' ||
    activeFolder.myPermission === 'ADMIN' ||
    activeFolder.myPermission === 'EDIT' ||
    (activeFolder.myPermission === undefined && Boolean(userId && activeFolder.userId === userId));

  if (!canWrite) {
    return {
      enabled: false,
      label: 'Subir archivo',
      disabledTooltip: 'Tienes acceso de solo lectura en esta carpeta.',
    };
  }

  const label =
    activeFolder.type === 'image'
      ? 'Subir imagen'
      : activeFolder.type === 'table'
      ? 'Subir tabla'
      : 'Subir PDF';

  return {
    enabled: true,
    label,
    disabledTooltip: null,
  };
}
