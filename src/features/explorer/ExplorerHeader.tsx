import React from 'react';
import { Link } from 'react-router';
import {
  ChevronRight,
  ClipboardPlus,
  FolderPlus,
  LayoutGrid,
  List,
  Search,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import { NotificationBell } from '../notifications/NotificationBell';
import type { FolderItem } from '../../types/media';
import type { ExplorerViewMode } from '../../services/storageService';
import type { CreateFolderGuardResult } from './explorerRules';
import styles from './ExplorerHeader.module.css';

/**
 * Propiedades de la cabecera del Explorador Unificado (`ExplorerHeader`).
 */
export interface ExplorerHeaderProps {
  /** Secuencia ordenada de carpetas desde Nivel 1 hasta la carpeta actual. */
  breadcrumbs: FolderItem[];
  /** Término actual del buscador rápido en vivo. */
  searchQuery: string;
  /** Callback al cambiar el texto de búsqueda. */
  onSearchChange: (value: string) => void;
  /** Modo de visualización activo (`grid` o `list`). */
  viewMode: ExplorerViewMode;
  /** Callback para alternar el modo de vista persistido. */
  onViewModeChange: (mode: ExplorerViewMode) => void;
  /** Resultado de validación para crear nueva carpeta en el nivel actual. */
  createFolderGuard: CreateFolderGuardResult;
  /** Abre el diálogo de creación de carpeta. */
  onOpenCreateFolder: () => void;
  /** Habilita el acceso directo `+ Formulario` dentro de carpetas `TABLE` con permiso `EDIT`. */
  canCreateForm?: boolean;
  /** Abre el diálogo de creación de formulario dinámico (`CreateFormDialog`). */
  onOpenCreateForm?: () => void;
  /** Abre la paleta rápida `⌘K`. */
  onOpenCommandPalette: () => void;
}

/**
 * Cabecera editorial del explorador: migas de pan interactivas derivadas del árbol,
 * buscador en vivo, acceso `⌘K`, alternador persistido Cuadrícula/Lista, botón `+ Carpeta`
 * con reglas de profundidad/RBAC y `NotificationBell`.
 */
export const ExplorerHeader: React.FC<ExplorerHeaderProps> = ({
  breadcrumbs,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  createFolderGuard,
  onOpenCreateFolder,
  canCreateForm = false,
  onOpenCreateForm,
  onOpenCommandPalette,
}) => {
  const isRoot = breadcrumbs.length === 0;

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <nav className={styles.breadcrumbs} aria-label="Migas de pan">
          {isRoot ? (
            <h1 className={styles.crumbCurrent}>Explorador</h1>
          ) : (
            <>
              <Link to="/" className={styles.crumbLink}>
                Explorador
              </Link>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight size={14} className={styles.crumbSep} aria-hidden="true" />
                    {isLast ? (
                      <h1 className={styles.crumbCurrent}>{crumb.name}</h1>
                    ) : (
                      <Link to={`/folder/${crumb.id}`} className={styles.crumbLink}>
                        {crumb.name}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}
        </nav>

        <div className={styles.controlsRow}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder={isRoot ? 'Filtrar carpetas...' : 'Filtrar en esta carpeta...'}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Filtrar elementos en el explorador"
            />
            {searchQuery ? (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => onSearchChange('')}
                aria-label="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenCommandPalette}
            aria-label="Abrir paleta rápida (⌘K)"
          >
            <span className={styles.kbdHint}>⌘K</span>
          </Button>

          <div className={styles.viewToggle} role="group" aria-label="Modo de visualización">
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
              aria-label="Vista en cuadrícula"
              aria-pressed={viewMode === 'grid'}
              onClick={() => onViewModeChange('grid')}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
              aria-label="Vista en lista"
              aria-pressed={viewMode === 'list'}
              onClick={() => onViewModeChange('list')}
            >
              <List size={15} />
            </button>
          </div>

          {createFolderGuard.allowed ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<FolderPlus size={15} />}
              onClick={onOpenCreateFolder}
              data-testid="explorer-new-folder-btn"
            >
              + Carpeta
            </Button>
          ) : (
            <Tooltip content={createFolderGuard.reason} side="bottom">
              <span className={styles.tooltipWrap} tabIndex={0}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FolderPlus size={15} />}
                  disabled
                  data-testid="explorer-new-folder-btn"
                >
                  + Carpeta
                </Button>
              </span>
            </Tooltip>
          )}

          {canCreateForm && onOpenCreateForm ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<ClipboardPlus size={15} />}
              onClick={onOpenCreateForm}
              data-testid="explorer-new-form-btn"
            >
              + Formulario
            </Button>
          ) : null}

          <NotificationBell />
        </div>
      </div>
    </header>
  );
};
