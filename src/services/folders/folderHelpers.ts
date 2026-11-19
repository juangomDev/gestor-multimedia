import type { ApiFolder } from '../../types/api';
import type { FolderItem, FolderCategory } from '../../types/media';

/**
 * Normaliza un registro `ApiFolder` devuelto por PostgreSQL hacia la interfaz `FolderItem` del frontend.
 *
 * @param raw Objeto de carpeta devuelto por `monolith-backend`.
 * @returns Entidad `FolderItem` tipada y normalizada.
 */
export function normalizeFolder(
  raw?: (Omit<Partial<ApiFolder>, 'type'> & {
    id?: string;
    name?: string;
    type?: string;
    parentId?: string | null;
    isSystem?: boolean;
    children?: unknown[];
    isShared?: boolean;
  }) | null
): FolderItem {
  const safe = raw || {};
  const rawType = String(safe.type || 'IMAGE').toUpperCase();
  const normalizedType: FolderCategory =
    rawType === 'CONTAINER'
      ? 'container'
      : rawType === 'TABLE'
      ? 'table'
      : rawType === 'PDF'
      ? 'pdf'
      : 'image';

  const normalizedChildren = Array.isArray(safe.children)
    ? safe.children.map((child) => normalizeFolder(child as Record<string, unknown>))
    : undefined;

  return {
    id: safe.id || '',
    name: safe.name || 'General',
    type: normalizedType,
    parentId: safe.parentId ?? null,
    isSystem: safe.isSystem ?? false,
    ...(normalizedChildren ? { children: normalizedChildren } : {}),
    color: safe.color ?? null,
    isPrivate: safe.isPrivate ?? false,
    itemCount: safe.itemCount ?? 0,
    userId: safe.userId,
    owner: safe.owner,
    myPermission: safe.myPermission,
    isShared: safe.isShared,
    createdAt: safe.createdAt || new Date().toISOString(),
  };
}

/**
 * Aplana recursivamente un árbol jerárquico de carpetas conservando `parentId` en cada nodo.
 *
 * @param nodes Nodos raíz del árbol de carpetas.
 * @param parentId Identificador del padre inicial (`null` para raíz).
 * @returns Arreglo plano de carpetas sin duplicados.
 */
export function flattenFolderTree(
  nodes: FolderItem[],
  parentId: string | null = null
): FolderItem[] {
  const flat: FolderItem[] = [];
  const seen = new Set<string>();
  const walk = (items: FolderItem[], currentParent: string | null) => {
    for (const node of items) {
      const normalizedNode: FolderItem = { ...node, parentId: node.parentId ?? currentParent };
      if (!seen.has(normalizedNode.id)) {
        seen.add(normalizedNode.id);
        flat.push(normalizedNode);
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children, normalizedNode.id);
      }
    }
  };
  walk(nodes, parentId);
  return flat;
}

/**
 * Construye la ruta legible de hasta 3 niveles (`Padre › Subcarpeta`) para breadcrumbs y selectores.
 *
 * @param folder Carpeta destino.
 * @param allFolders Lista plana de todas las carpetas disponibles.
 * @returns Ruta jerárquica legible separada por ` › `.
 */
export function getFolderPathLabel(folder: FolderItem, allFolders: FolderItem[]): string {
  const parts: string[] = [folder.name];
  let curr: FolderItem | undefined = folder;
  const visited = new Set<string>([folder.id]);
  while (curr?.parentId && !visited.has(curr.parentId)) {
    visited.add(curr.parentId);
    const parent = allFolders.find((f) => f.id === curr!.parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    curr = parent;
  }
  return parts.join(' › ');
}

/**
 * Calcula la profundidad jerárquica de una carpeta (`0` para raíz, `1` Nivel 1, `2` Nivel 2, `3` Nivel 3).
 *
 * @param folderId UUID de la carpeta (o `null`/`undefined` para raíz).
 * @param allFolders Lista plana de carpetas del árbol.
 * @returns Profundidad numérica entre `0` y `3`.
 */
export function getFolderDepth(
  folderId: string | null | undefined,
  allFolders: FolderItem[]
): number {
  if (!folderId) return 0;
  const byId = new Map(allFolders.map((f) => [f.id, f]));
  let depth = 0;
  let curr = byId.get(folderId);
  const visited = new Set<string>();
  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    depth += 1;
    curr = curr.parentId ? byId.get(curr.parentId) : undefined;
  }
  return depth;
}
