import React, { useDeferredValue, useState } from 'react';
import { ChevronLeft, ChevronRight, KeyRound, Trash2, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Switch } from '../../components/ui/Switch';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tooltip } from '../../components/ui/Tooltip';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import {
  useUpdateUserStatusMutation,
  useUsersPaginatedQuery,
} from '../../queries/useAdminQueries';
import { formatDate } from '../../utils/formatters';
import { UsersDirectoryToolbar } from './UsersDirectoryToolbar';
import { CreateUserDialog } from './CreateUserDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { canMutateUser, isProtectedSystemUser } from './userRules';
import type { Role, User } from '../../types/auth';
import styles from './UsersDirectoryPanel.module.css';

const ROLE_TONE: Record<Role, 'accent' | 'ok' | 'neutral'> = {
  ADMIN: 'accent',
  MANAGER: 'ok',
  COLLABORATOR: 'neutral',
};

const PAGE_LIMIT = 25;

/**
 * Directorio RBAC reutilizable de usuarios (`GET /api/v1/users`) empleado en `/team` (`MANAGER`/`ADMIN`)
 * y `/admin/users` (`ADMIN`). Soporta filtros server-side (`search`, `role`, `isActive`), paginación,
 * alta jerárquica, toggle optimista Activar/Suspender, reseteo de clave y borrado en cascada.
 */
export const UsersDirectoryPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [roleFilter, setRoleFilter] = useState<'' | Role>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const usersQuery = useUsersPaginatedQuery({
    search: deferredSearch.trim() || undefined,
    role: roleFilter || undefined,
    isActive: statusFilter === '' ? undefined : statusFilter === 'active',
    page,
    limit: PAGE_LIMIT,
  });
  const updateStatus = useUpdateUserStatusMutation();

  const visibleUsers = usersQuery.data?.users ?? [];
  const total = usersQuery.data?.total ?? visibleUsers.length;
  const totalPages = usersQuery.data?.totalPages ?? 1;
  const hasFilters = Boolean(search || roleFilter || statusFilter);

  const handleClearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const handleToggleStatus = async (target: User, nextActive: boolean) => {
    try {
      await updateStatus.mutateAsync({ userId: target.id, isActive: nextActive });
      showToast(
        nextActive
          ? `Cuenta "${target.username}" activada.`
          : `Cuenta "${target.username}" suspendida.`,
        'info'
      );
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      showToast(detail || 'No se pudo cambiar el estado del usuario.', 'error');
    }
  };

  return (
    <div className={styles.panel} data-testid="users-directory-panel">
      <UsersDirectoryToolbar
        search={search}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        isAdmin={currentUser?.role === 'ADMIN'}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        onRoleFilterChange={(val) => {
          setRoleFilter(val);
          setPage(1);
        }}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        onClearFilters={handleClearFilters}
        onOpenCreate={() => setCreateOpen(true)}
      />

      {usersQuery.isLoading ? (
        <Skeleton variant="card" height={220} />
      ) : usersQuery.isError ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No se pudo cargar el directorio de usuarios"
          description="Verifica tu conexión con monolith-backend e intenta nuevamente."
        />
      ) : visibleUsers.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title={hasFilters ? 'Sin coincidencias' : 'Aún no hay colaboradores registrados'}
          description={
            hasFilters
              ? 'Ningún usuario coincide con los criterios de búsqueda y filtro activos.'
              : 'Crea tu primer colaborador para compartir carpetas y asignar permisos.'
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} data-testid="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Registro</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((item) => {
                const guard = canMutateUser(item, currentUser);
                const isSelf = item.id === currentUser?.id;
                const isSystem = isProtectedSystemUser(item);

                return (
                  <tr key={item.id} className={styles.row} data-testid={`user-row-${item.username}`}>
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.avatar} aria-hidden="true">
                          {item.username.slice(0, 2).toUpperCase()}
                        </span>
                        <span className={styles.username}>{item.username}</span>
                        {isSelf ? <Badge tone="accent">Tú</Badge> : null}
                        {isSystem ? (
                          <Badge tone="warn" mono>
                            SISTEMA
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <Badge tone={ROLE_TONE[item.role]} mono>
                        {item.role}
                      </Badge>
                    </td>
                    <td>
                      <div className={styles.statusCell}>
                        <Switch
                          checked={item.isActive}
                          disabled={!guard.allowed || updateStatus.isPending}
                          ariaLabel={`Estado activo de ${item.username}`}
                          onCheckedChange={(checked) => void handleToggleStatus(item, checked)}
                        />
                        <span className={styles.statusLabel}>
                          {item.isActive ? 'Activo' : 'Suspendido'}
                        </span>
                      </div>
                    </td>
                    <td className={styles.monoCell}>
                      {item.createdAt ? formatDate(item.createdAt) : '—'}
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        {guard.allowed ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<KeyRound size={14} />}
                              onClick={() => setResetTarget(item)}
                              aria-label={`Restablecer contraseña de ${item.username}`}
                              data-testid={`reset-pwd-btn-${item.username}`}
                            >
                              Clave
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 size={14} />}
                              onClick={() => setDeleteTarget(item)}
                              aria-label={`Eliminar usuario ${item.username}`}
                              data-testid={`delete-user-btn-${item.username}`}
                            >
                              Eliminar
                            </Button>
                          </>
                        ) : (
                          <Tooltip content={guard.reason} side="left">
                            <span className={styles.statusLabel}>Protegido</span>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className={styles.paginationBar} data-testid="users-pagination">
            <span>
              {total} {total === 1 ? 'usuario' : 'usuarios'} · Página {page} de{' '}
              {Math.max(1, totalPages)}
            </span>
            <div className={styles.paginationBtns}>
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronLeft size={14} />}
                disabled={page <= 1 || usersQuery.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                iconRight={<ChevronRight size={14} />}
                disabled={page >= totalPages || usersQuery.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ResetPasswordDialog
        targetUser={resetTarget}
        open={Boolean(resetTarget)}
        onOpenChange={(next) => {
          if (!next) setResetTarget(null);
        }}
      />
      <DeleteUserDialog
        targetUser={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
      />
    </div>
  );
};
