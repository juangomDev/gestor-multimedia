import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import {
  Archive,
  ChevronsUpDown,
  FolderOpen,
  KeyRound,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings2,
  Sun,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/DropdownMenu';
import { useAuth } from '../../context/useAuth';
import { useTheme } from '../../context/useTheme';
import { useShell } from './useShell';
import { resolveContextualUploadState } from './uploadContextRules';
import type { FolderItem } from '../../types/media';
import type { Role } from '../../types/auth';
import styles from './Sidebar.module.css';

/**
 * Propiedades de la barra lateral contextual (`Sidebar`).
 */
export interface SidebarProps {
  /** Callback ejecutado tras seleccionar una ruta o acción (cierra el drawer móvil). */
  onNavigate?: () => void;
  /** Adapta los bordes cuando la barra lateral se renderiza dentro del drawer móvil. */
  inDrawer?: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor de equipo',
  COLLABORATOR: 'Colaborador',
};

const SPINE_CLASS: Record<FolderItem['type'], string> = {
  container: styles.spineContainer,
  image: styles.spineImage,
  table: styles.spineTable,
  pdf: styles.spinePdf,
};

/**
 * Barra lateral fundida al lienzo (228px, `--paper-canvas`) con botón contextual de subida,
 * acceso `⌘K`, navegación filtrada por rol RBAC y menú de usuario con cambio de clave y logout real.
 */
export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, inDrawer = false }) => {
  const { user, isAdmin, isManager, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const {
    activeFolder,
    openCommandPalette,
    openChangePassword,
    triggerContextualUpload,
  } = useShell();
  const location = useLocation();
  const navigate = useNavigate();

  const uploadState = resolveContextualUploadState(activeFolder, user?.role, user?.id);
  const isExplorerActive =
    location.pathname === '/' || location.pathname.startsWith('/folder/');

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    onNavigate?.();
    const logoutPromise = logout();
    navigate('/login', { replace: true, state: null });
    void logoutPromise;
  };

  const handleUploadClick = () => {
    if (!uploadState.enabled) return;
    onNavigate?.();
    triggerContextualUpload();
  };

  return (
    <aside
      className={`${styles.sidebar} ${inDrawer ? styles.inDrawer : ''}`}
      aria-label="Navegación principal"
    >
      <div className={styles.brandRow}>
        <NavLink to="/" className={styles.brandLink} onClick={onNavigate}>
          <span className={styles.brandMark} aria-hidden="true">
            <Archive size={14} />
          </span>
          <span className={styles.brandTitle}>Bóveda</span>
        </NavLink>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={
            resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
          }
          title={resolvedTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          icon={resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        />
      </div>

      <div className={styles.actionsBlock}>
        {uploadState.enabled ? (
          <Button
            variant="primary"
            fullWidth
            icon={<Plus size={16} />}
            onClick={handleUploadClick}
            data-testid="sidebar-upload-btn"
          >
            {uploadState.label}
          </Button>
        ) : (
          <Tooltip content={uploadState.disabledTooltip} side="right">
            <span className={styles.tooltipWrap} tabIndex={0}>
              <Button
                variant="primary"
                fullWidth
                icon={<Plus size={16} />}
                disabled
                data-testid="sidebar-upload-btn"
              >
                {uploadState.label}
              </Button>
            </span>
          </Tooltip>
        )}

        <button
          type="button"
          className={styles.commandTrigger}
          onClick={() => {
            onNavigate?.();
            openCommandPalette();
          }}
          aria-label="Abrir búsqueda rápida o código corto (⌘K)"
        >
          <span className={styles.commandTriggerLeft}>
            <Search size={14} aria-hidden="true" />
            <span>Buscar o código...</span>
          </span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>
      </div>

      <nav className={styles.nav} aria-label="Secciones del espacio">
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Espacio</span>

          <NavLink
            to="/"
            onClick={onNavigate}
            className={`${styles.navLink} ${isExplorerActive ? styles.navLinkActive : ''}`}
          >
            <FolderOpen size={16} aria-hidden="true" />
            <span>Explorador</span>
          </NavLink>

          <NavLink
            to="/chat"
            onClick={onNavigate}
            onMouseEnter={() => void import('../chat/DataChatPage')}
            onFocus={() => void import('../chat/DataChatPage')}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            <MessageSquare size={16} aria-hidden="true" />
            <span>Data Chat</span>
          </NavLink>

          {isManager || isAdmin ? (
            <NavLink
              to="/team"
              onClick={onNavigate}
              onMouseEnter={() => void import('../team/TeamPage')}
              onFocus={() => void import('../team/TeamPage')}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <Users size={16} aria-hidden="true" />
              <span>Mi equipo</span>
            </NavLink>
          ) : null}
        </div>

        {isAdmin ? (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Administración</span>
            <NavLink
              to="/admin"
              onClick={onNavigate}
              onMouseEnter={() => void import('../admin/AdminPage')}
              onFocus={() => void import('../admin/AdminPage')}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <Settings2 size={16} aria-hidden="true" />
              <span>Sistema y API</span>
            </NavLink>
          </div>
        ) : null}

        {activeFolder ? (
          <div className={`${styles.folderHint} ${SPINE_CLASS[activeFolder.type]}`}>
            <span className={styles.folderHintName} title={activeFolder.name}>
              {activeFolder.name}
            </span>
          </div>
        ) : null}
      </nav>

      <div className={styles.footer}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={styles.userTrigger}
              aria-label="Menú de cuenta de usuario"
            >
              <span className={styles.avatar} aria-hidden="true">
                {initials}
              </span>
              <span className={styles.userMeta}>
                <span className={styles.username}>{user?.username || 'Usuario'}</span>
                <span className={styles.roleText}>
                  {user?.role ? ROLE_LABELS[user.role] : 'Sesión'}
                </span>
              </span>
              <ChevronsUpDown size={14} className={styles.chevron} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" sideOffset={8}>
            <DropdownMenuLabel>{user?.username}</DropdownMenuLabel>
            <DropdownMenuItem
              icon={<KeyRound size={14} />}
              onSelect={() => {
                onNavigate?.();
                openChangePassword();
              }}
            >
              Cambiar contraseña
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              tone="danger"
              icon={<LogOut size={14} />}
              onSelect={() => {
                void handleLogout();
              }}
            >
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};
