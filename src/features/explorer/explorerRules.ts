import { getFolderDepth } from '../../services/foldersService';
import { ACCEPTED_IMAGE_EXTENSIONS, isSupportedImageFile } from '../../services/imagesService';
import { ACCEPTED_TABLE_EXTENSIONS, isSupportedTableFile } from '../../services/tablesService';
import { isSupportedPdfFile } from '../../services/pdfsService';
import type { FolderCategory, FolderItem, MediaCategory } from '../../types/media';
import type { Role } from '../../types/auth';

/** Nombre de usuario de la cuenta de servicio pública del Widget Chat en `monolith-backend`. */
export const AI_MANAGER_USERNAME = 'ai_manager';

/** Límite máximo en bytes para imágenes y PDFs (50 MB). */
export const MAX_IMAGE_PDF_BYTES = 50 * 1024 * 1024;

/** Límite máximo en bytes para tablas `.csv`, `.xlsx`, `.xls`, `.json` (100 MB). */
export const MAX_TABLE_BYTES = 100 * 1024 * 1024;

/** Límite máximo de elementos por operación masiva en lote (`/bulk-move`, `/bulk-delete`). */
export const MAX_BULK_ITEMS = 50;

/**
 * Restricciones de carga contextual derivadas del tipo de carpeta activa.
 */
export interface FolderUploadConstraints {
  accept: string;
  maxBytes: number;
  maxSizeLabel: string;
  formatsLabel: string;
  artifactLabel: string;
  validateFile: (file: File) => boolean;
}

/**
 * Resultado de evaluación de permiso para crear una carpeta hija en el nivel actual.
 */
export interface CreateFolderGuardResult {
  allowed: boolean;
  reason: string | null;
}

/** Indica si la carpeta es una bóveda reservada del sistema (ej. `shared`). */
export function isSystemFolder(folder: Pick<FolderItem, 'isSystem'> | null | undefined): boolean {
  return Boolean(folder?.isSystem);
}

/** Indica si la carpeta es la carpeta protegida `General` (no renombrable ni eliminable). */
export function isGeneralFolder(folder: Pick<FolderItem, 'name'> | null | undefined): boolean {
  return Boolean(folder && folder.name.trim().toLowerCase() === 'general');
}

/**
 * Determina si el usuario actual posee permisos de escritura (`EDIT` o `ADMIN`) sobre el contenido de una carpeta.
 */
export function canWriteFolder(
  folder: FolderItem | null | undefined,
  userRole: Role | undefined,
  userId: string | undefined
): boolean {
  if (!folder || folder.isSystem) return false;
  if (userRole === 'ADMIN') return true;
  if (folder.myPermission === 'ADMIN' || folder.myPermission === 'EDIT') return true;
  if (folder.myPermission === 'READ') return false;
  if (userId && (folder.userId === userId || folder.owner?.id === userId)) return true;
  return false;
}

/**
 * Determina si el usuario puede administrar la entidad carpeta en sí (renombrar, editar metadatos,
 * compartir o eliminar en cascada): exclusivo de `ADMIN` o del propietario (`myPermission === 'ADMIN'`).
 * Un `COLLABORATOR` invitado con `EDIT` puede operar archivos dentro, pero no eliminar ni renombrar la carpeta.
 */
export function canManageFolderEntity(
  folder: FolderItem | null | undefined,
  userRole: Role | undefined,
  userId: string | undefined
): boolean {
  if (!folder || folder.isSystem) return false;
  if (userRole === 'ADMIN') return true;
  if (folder.myPermission === 'ADMIN') return true;
  if (userId && (folder.userId === userId || folder.owner?.id === userId)) return true;
  if (userRole === 'MANAGER' && !folder.isShared && !folder.userId && folder.myPermission === 'EDIT') {
    return true;
  }
  return false;
}

/**
 * Determina si el usuario puede gestionar la compartición de una carpeta (`ADMIN` o propietario).
 */
export function canManageFolderShares(
  folder: FolderItem | null | undefined,
  userRole: Role | undefined,
  userId: string | undefined
): boolean {
  return canManageFolderEntity(folder, userRole, userId);
}

/**
 * Evalúa las reglas exactas de `folders.hierarchy.service.ts` para habilitar `+ Carpeta`.
 * - Bloquea a `COLLABORATOR` en raíz (`parentId: null`).
 * - Bloquea creación dentro de bóvedas de sistema (`shared`) o carpetas solo lectura (`READ`).
 * - Bloquea creación en Nivel 3 (`depth >= 3`, `MAX_FOLDER_DEPTH_EXCEEDED`).
 */
export function canCreateChildFolder(
  activeFolder: FolderItem | null,
  allFolders: FolderItem[],
  userRole: Role | undefined,
  userId: string | undefined
): CreateFolderGuardResult {
  if (!activeFolder) {
    if (userRole === 'COLLABORATOR') {
      return {
        allowed: false,
        reason: 'Los colaboradores solo pueden crear subcarpetas dentro de carpetas con permiso de edición.',
      };
    }
    return { allowed: true, reason: null };
  }

  if (activeFolder.isSystem) {
    return {
      allowed: false,
      reason: 'La bóveda compartida del sistema es de solo lectura.',
    };
  }

  const depth = getFolderDepth(activeFolder.id, allFolders);
  if (depth >= 3) {
    return {
      allowed: false,
      reason: 'Profundidad máxima alcanzada (3 niveles). No se pueden crear más subcarpetas aquí.',
    };
  }

  if (!canWriteFolder(activeFolder, userRole, userId)) {
    return {
      allowed: false,
      reason: 'Necesitas permiso de edición (EDIT) para crear subcarpetas aquí.',
    };
  }

  return { allowed: true, reason: null };
}

/**
 * Devuelve los tipos de carpeta permitidos para crear bajo `parentFolder`:
 * - Raíz o `CONTAINER` de Nivel 1: los 4 tipos (`container`, `image`, `table`, `pdf`).
 * - `CONTAINER` de Nivel 2 (creando hijo hoja en Nivel 3): solo tipos finales (`image`, `table`, `pdf`).
 * - Carpeta tipada (`image`, `table`, `pdf`): hereda y bloquea obligatoriamente el tipo del padre.
 */
export function getAllowedChildFolderTypes(
  parentFolder: FolderItem | null,
  allFolders: FolderItem[] = []
): FolderCategory[] {
  if (!parentFolder) {
    return ['container', 'image', 'table', 'pdf'];
  }
  if (parentFolder.type === 'container') {
    const parentDepth = allFolders.length > 0 ? getFolderDepth(parentFolder.id, allFolders) : 1;
    if (parentDepth >= 2) {
      return ['image', 'table', 'pdf'];
    }
    return ['container', 'image', 'table', 'pdf'];
  }
  return [parentFolder.type];
}

/**
 * Calcula la altura del subárbol de una carpeta (`1` si no tiene hijos, `2` si tiene hijos, `3` si tiene nietos)
 * y el conjunto de IDs de sus descendientes directos e indirectos (incluyendo la propia carpeta).
 */
function analyzeFolderSubtree(
  folderId: string,
  allFolders: FolderItem[]
): { descendantIds: Set<string>; subtreeHeight: number; hasContainerChild: boolean } {
  const childrenByParent = new Map<string, FolderItem[]>();
  for (const item of allFolders) {
    if (!item.parentId) continue;
    const list = childrenByParent.get(item.parentId) ?? [];
    list.push(item);
    childrenByParent.set(item.parentId, list);
  }

  const descendantIds = new Set<string>([folderId]);
  let maxDepth = 1;
  let hasContainerChild = false;

  const walk = (currentId: string, level: number) => {
    const children = childrenByParent.get(currentId) ?? [];
    for (const child of children) {
      if (descendantIds.has(child.id)) continue;
      descendantIds.add(child.id);
      if (child.type === 'container') hasContainerChild = true;
      const nextLevel = level + 1;
      if (nextLevel > maxDepth) maxDepth = nextLevel;
      walk(child.id, nextLevel);
    }
  };

  walk(folderId, 1);
  return { descendantIds, subtreeHeight: maxDepth, hasContainerChild };
}

/**
 * Devuelve las carpetas destino válidas como nuevo `parentId` al reubicar `folder` (`PATCH /api/v1/folders/:id`):
 * - Excluye la propia carpeta, todos sus descendientes (evita ciclos) y bóvedas de sistema (`shared`).
 * - Respeta la profundidad máxima de 3 niveles (`parentDepth + subtreeHeight <= 3`) y las reglas de tipo.
 * - Exige permiso de escritura (`EDIT`/`ADMIN`) sobre la carpeta destino, conservando siempre el padre actual.
 *
 * @param folder Carpeta que se desea reubicar.
 * @param allFolders Lista plana completa de carpetas disponibles.
 * @param userRole Rol del usuario autenticado.
 * @param userId Identificador del usuario autenticado.
 * @returns Carpetas contenedoras/padre válidas como destino de reubicación.
 */
export function getValidMoveFolderParents(
  folder: FolderItem,
  allFolders: FolderItem[],
  userRole: Role | undefined,
  userId: string | undefined
): FolderItem[] {
  if (folder.isSystem || isGeneralFolder(folder)) return [];

  const { descendantIds, subtreeHeight, hasContainerChild } = analyzeFolderSubtree(
    folder.id,
    allFolders
  );

  return allFolders.filter((candidate) => {
    if (descendantIds.has(candidate.id)) return false;
    if (candidate.isSystem) return false;

    const isCurrentParent = candidate.id === folder.parentId;
    if (!isCurrentParent && !canWriteFolder(candidate, userRole, userId)) return false;

    const candidateDepth = getFolderDepth(candidate.id, allFolders);
    if (candidateDepth + subtreeHeight > 3) return false;
    if (hasContainerChild && candidateDepth >= 1) return false;

    const allowedChildTypes = getAllowedChildFolderTypes(candidate, allFolders);
    return allowedChildTypes.includes(folder.type);
  });
}

/**
 * Reconstruye la secuencia ordenada de migas de pan desde Nivel 1 hasta la carpeta actual.
 */
export function getBreadcrumbTrail(
  folderId: string | undefined,
  allFolders: FolderItem[]
): FolderItem[] {
  if (!folderId) return [];
  const byId = new Map(allFolders.map((f) => [f.id, f]));
  const trail: FolderItem[] = [];
  const visited = new Set<string>();
  let curr = byId.get(folderId);

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    trail.unshift(curr);
    curr = curr.parentId ? byId.get(curr.parentId) : undefined;
  }
  return trail;
}

/**
 * Retorna las restricciones de tipo MIME, extensiones y peso máximo para una carpeta tipada.
 */
export function getUploadConstraints(type: MediaCategory): FolderUploadConstraints {
  if (type === 'image') {
    return {
      accept: ACCEPTED_IMAGE_EXTENSIONS,
      maxBytes: MAX_IMAGE_PDF_BYTES,
      maxSizeLabel: '50 MB',
      formatsLabel: 'PNG, JPG, WebP, GIF o SVG',
      artifactLabel: 'imágenes',
      validateFile: isSupportedImageFile,
    };
  }
  if (type === 'table') {
    return {
      accept: ACCEPTED_TABLE_EXTENSIONS,
      maxBytes: MAX_TABLE_BYTES,
      maxSizeLabel: '100 MB',
      formatsLabel: 'CSV, XLSX, XLS o JSON',
      artifactLabel: 'tablas',
      validateFile: isSupportedTableFile,
    };
  }
  return {
    accept: '.pdf,application/pdf',
    maxBytes: MAX_IMAGE_PDF_BYTES,
    maxSizeLabel: '50 MB',
    formatsLabel: 'PDF',
    artifactLabel: 'documentos PDF',
    validateFile: isSupportedPdfFile,
  };
}
