import React from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { Role } from '../../types/auth';
import styles from './UsersDirectoryPanel.module.css';

/**
 * Propiedades de la barra de filtros y alta del directorio de usuarios (`UsersDirectoryToolbar`).
 */
export interface UsersDirectoryToolbarProps {
  search: string;
  roleFilter: '' | Role;
  statusFilter: '' | 'active' | 'inactive';
  isAdmin: boolean;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: '' | Role) => void;
  onStatusFilterChange: (value: '' | 'active' | 'inactive') => void;
  onClearFilters: () => void;
  onOpenCreate: () => void;
}

/**
 * Barra superior de filtros server-side (`search`, `role`, `isActive`) y botón de alta jerárquica
 * para `UsersDirectoryPanel`.
 */
export const UsersDirectoryToolbar: React.FC<UsersDirectoryToolbarProps> = ({
  search,
  roleFilter,
  statusFilter,
  isAdmin,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onClearFilters,
  onOpenCreate,
}) => {
  const hasFilters = Boolean(search || roleFilter || statusFilter);

  return (
    <div className={styles.toolbar}>
      <div className={styles.filterCluster}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar por usuario..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Filtrar usuarios"
            data-testid="users-search-input"
          />
        </div>

        <select
          aria-label="Filtrar usuarios por rol"
          className={styles.select}
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value as '' | Role)}
          data-testid="users-role-filter"
        >
          <option value="">Todos los roles</option>
          {isAdmin ? <option value="ADMIN">ADMIN</option> : null}
          {isAdmin ? <option value="MANAGER">MANAGER</option> : null}
          <option value="COLLABORATOR">COLLABORATOR</option>
        </select>

        <select
          aria-label="Filtrar usuarios por estado"
          className={styles.select}
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as '' | 'active' | 'inactive')}
          data-testid="users-status-filter"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Suspendidos</option>
        </select>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<X size={13} />}
            onClick={onClearFilters}
            data-testid="users-clear-filters-btn"
          >
            Limpiar
          </Button>
        ) : null}
      </div>

      <Button
        variant="primary"
        size="sm"
        icon={<UserPlus size={14} />}
        onClick={onOpenCreate}
        data-testid="open-create-user-btn"
      >
        {isAdmin ? 'Nuevo usuario' : 'Nuevo colaborador'}
      </Button>
    </div>
  );
};
