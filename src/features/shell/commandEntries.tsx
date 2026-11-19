import React from 'react';
import { Folder, MessageSquare, Settings2, Users } from 'lucide-react';
import { getFolderPathLabel } from '../../services/foldersService';
import type { FolderItem } from '../../types/media';

/**
 * Elemento seleccionable dentro de la paleta rápida `⌘K`.
 */
export interface CommandEntry {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  dot?: 'container' | 'image' | 'table' | 'pdf';
  icon: React.ReactNode;
  targetPath: string;
}

/**
 * Construye y filtra los resultados navegables de la paleta rápida `⌘K`
 * combinando rutas permitidas según rol RBAC y carpetas del árbol cargado.
 *
 * @param params Carpetas disponibles, permisos de rol y término de búsqueda normalizado.
 * @returns Lista acotada de entradas navegables.
 */
export function buildCommandEntries(params: {
  allFolders: FolderItem[];
  query: string;
  isAdmin: boolean;
  isManager: boolean;
}): CommandEntry[] {
  const { allFolders, query, isAdmin, isManager } = params;

  const navItems: CommandEntry[] = [
    {
      id: 'nav-explorer',
      title: 'Explorador de carpetas',
      subtitle: 'Vista principal del archivo',
      icon: <Folder size={15} />,
      targetPath: '/',
    },
    {
      id: 'nav-chat',
      title: 'Data Chat',
      subtitle: 'Consulta analítica RAG sobre tablas y PDFs',
      icon: <MessageSquare size={15} />,
      targetPath: '/chat',
    },
  ];

  if (isManager || isAdmin) {
    navItems.push({
      id: 'nav-team',
      title: 'Mi equipo',
      subtitle: 'Colaboradores, actividad y almacenamiento',
      icon: <Users size={15} />,
      targetPath: '/team',
    });
  }

  if (isAdmin) {
    navItems.push({
      id: 'nav-admin',
      title: 'Sistema y API',
      subtitle: 'Usuarios globales, auditoría, API Keys y salud',
      icon: <Settings2 size={15} />,
      targetPath: '/admin',
    });
  }

  const folderItems: CommandEntry[] = allFolders.map((folder) => ({
    id: `folder-${folder.id}`,
    title: folder.name,
    subtitle: getFolderPathLabel(folder, allFolders),
    badge: folder.isSystem ? 'SISTEMA' : folder.type.toUpperCase(),
    dot: folder.type,
    icon: <Folder size={15} />,
    targetPath: `/folder/${folder.id}`,
  }));

  const all = [...navItems, ...folderItems];
  if (!query) return all.slice(0, 12);

  return all
    .filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.subtitle.toLowerCase().includes(query)
    )
    .slice(0, 14);
}
