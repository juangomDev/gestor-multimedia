import React, { useDeferredValue, useMemo, useState } from 'react';
import { KeyRound, Search, Trash2, UserPlus, Users } from 'lucide-react';
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
  useUsersQuery,
} from '../../queries/useAdminQueries';
import { formatDate } from '../../utils/formatters';
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

/**
 * Directorio RBAC reutilizable de usuarios (`GET /api/v1/users`) empleado en `/team` (`MANAGER`/`ADMIN`)
 * y `/admin/users` (`ADMIN`). Soporta alta jerárquica, toggle optimista Activar/Suspender,
 * reseteo de clave y borrado en cascada protegiendo cuentas de sistema (`ai_manager`) y auto-eliminación.
 */
export const UsersDirectoryPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const usersQuery = useUsersQuery();
  const updateStatus = useUpdateUserStatusMutation();

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const visibleUsers = useMemo(() => {
    const list = usersQuery.data ?? [];
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) => u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
  }, [usersQuery.data, deferredSearch]);

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
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Filtrar por usuario o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filtrar usuarios"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<UserPlus size={14} />}
          onClick={() => setCreateOpen(true)}
          data-testid="open-create-user-btn"
        >
          {currentUser?.role === 'ADMIN' ? 'Nuevo usuario' : 'Nuevo colaborador'}
        </Button>
      </div>

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
          title={deferredSearch ? 'Sin coincidencias' : 'Aún no hay colaboradores registrados'}
          description={
            deferredSearch
              ? `Ningún usuario coincide con "${deferredSearch}".`
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
