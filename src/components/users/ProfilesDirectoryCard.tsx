import React from 'react';
import {
  Users,
  Copy,
  Trash2,
  UserCheck,
  KeyRound,
  Power,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { copyToClipboard } from '../../utils/clipboard';
import { formatDate } from '../../utils/formatters';
import type { User } from '../../types/auth';
import styles from './ProfilesDirectoryCard.module.css';

/**
 * Propiedades del directorio de perfiles registrados y matriz de permisos RBAC.
 */
export interface ProfilesDirectoryCardProps {
  profiles: User[];
  loading?: boolean;
  onRefresh?: () => void;
  onToggleStatus: (user: User) => void;
  onOpenResetPassword: (user: User) => void;
  onOpenDeleteUser: (user: User) => void;
}

/**
 * Tarjeta que presenta la tabla dinámica de usuarios de PostgreSQL con columnas
 * (Usuario, Rol, Creado por, Estado, Fecha de registro y Acciones RBAC) y la matriz de permisos.
 */
export const ProfilesDirectoryCard: React.FC<ProfilesDirectoryCardProps> = ({
  profiles,
  loading = false,
  onRefresh,
  onToggleStatus,
  onOpenResetPassword,
  onOpenDeleteUser,
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  /**
   * Resuelve una etiqueta legible para la columna "Creado por" a partir del `createdById`.
   */
  const resolveCreatorLabel = (createdById?: string | null): string => {
    if (!createdById) return 'ADMIN / Sistema';
    if (currentUser && createdById === currentUser.id) return `${currentUser.username} (Tú)`;
    const found = profiles.find((u) => u.id === createdById);
    return found ? found.username : createdById.slice(0, 8);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={styles.cardIcon}>
            <Users size={18} />
          </div>
          <div>
            <h2 className={styles.cardTitle}>Directorio de Perfiles</h2>
            <span className={styles.cardSubtitle}>
              Cuentas registradas en PostgreSQL según tu nivel jerárquico ({profiles.length}).
            </span>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className={styles.iconBtn}
            title="Sincronizar lista de usuarios"
            aria-label="Sincronizar usuarios"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className={styles.directoryList}>
        <div className={styles.userCard}>
          <div className={styles.userLeft}>
            <div className={`${styles.userAvatar} ${styles.userAvatarAdmin}`}>AD</div>
            <div className={styles.userMeta}>
              <div className={styles.userNameRow}>
                <span className={styles.userName}>
                  {currentUser?.role === 'ADMIN' ? currentUser.username : 'admin'}
                </span>
                <span className={styles.adminPill}>ADMIN MAESTRO</span>
              </div>
              <span className={styles.userSub}>Control total y gestión jerárquica de usuarios</span>
            </div>
          </div>
          <div className={styles.userRight}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
              Activo
            </span>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            No hay perfiles registrados todavía. Usa el formulario de la izquierda para dar de alta
            al primer usuario.
          </div>
        ) : (
          <div className={styles.usersTableWrapper}>
            <table className={styles.usersTable} aria-label="Tabla de usuarios registrados">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Creado por</th>
                  <th>Estado</th>
                  <th>Fecha de registro</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const isSelfAdmin = p.role === 'ADMIN' && p.id === currentUser?.id;
                  const roleClass =
                    p.role === 'ADMIN'
                      ? styles.adminPill
                      : p.role === 'MANAGER'
                      ? styles.managerBadge
                      : styles.roleBadge;

                  return (
                    <tr key={p.id} data-testid={`user-row-${p.username}`}>
                      <td>
                        <div className={styles.userLeft}>
                          <div className={styles.userAvatar}>
                            {p.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span className={styles.userName}>{p.username}</span>
                        </div>
                      </td>
                      <td>
                        <span className={roleClass}>{p.role || 'COLLABORATOR'}</span>
                      </td>
                      <td>
                        <span className={styles.userSub}>
                          {resolveCreatorLabel(p.createdById)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            p.isActive ? styles.statusActiveBadge : styles.statusSuspendedBadge
                          }
                        >
                          {p.isActive ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.userSub}>{formatDate(p.createdAt || '')}</span>
                      </td>
                      <td>
                        <div className={styles.userRight} style={{ justifyContent: 'flex-end' }}>
                          {!isSelfAdmin && (
                            <button
                              type="button"
                              onClick={() => onToggleStatus(p)}
                              className={styles.iconBtn}
                              title={
                                p.isActive
                                  ? `Suspender a ${p.username}`
                                  : `Reactivar a ${p.username}`
                              }
                              aria-label={
                                p.isActive
                                  ? `Suspender usuario ${p.username}`
                                  : `Activar usuario ${p.username}`
                              }
                              style={{
                                color: p.isActive
                                  ? 'var(--color-success)'
                                  : 'var(--text-muted)',
                              }}
                            >
                              <Power size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenResetPassword(p)}
                            className={styles.iconBtn}
                            title={`Restablecer contraseña de ${p.username}`}
                            aria-label={`Restablecer contraseña de ${p.username}`}
                          >
                            <KeyRound size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await copyToClipboard(p.username);
                              showToast(`Nombre '${p.username}' copiado`, 'info');
                            }}
                            className={styles.iconBtn}
                            title="Copiar nombre de usuario"
                            aria-label={`Copiar usuario ${p.username}`}
                          >
                            <Copy size={15} />
                          </button>
                          {!isSelfAdmin && (
                            <button
                              type="button"
                              onClick={() => onOpenDeleteUser(p)}
                              className={styles.iconBtn}
                              title={`Eliminar usuario ${p.username}`}
                              aria-label={`Eliminar usuario ${p.username}`}
                              style={{ color: 'var(--color-danger)' }}
                            >
                              <Trash2 size={15} />
                            </button>
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
      </div>

      <div className={styles.permissionsMatrix}>
        <span className={styles.matrixTitle}>Matriz de Permisos por Rol (RBAC)</span>
        <div className={styles.matrixRow}>
          <UserCheck
            size={14}
            style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }}
          />
          <span>
            <strong>ADMIN:</strong> Administración total del sistema, creación de MANAGER y
            COLLABORATOR, suspensión/activación y borrado en cascada.
          </span>
        </div>
        <div className={styles.matrixRow}>
          <UserCheck
            size={14}
            style={{ color: '#38bdf8', flexShrink: 0, marginTop: 2 }}
          />
          <span>
            <strong>MANAGER:</strong> Creación y administración exclusiva de sus propios usuarios
            COLLABORATOR y compartición de carpetas.
          </span>
        </div>
        <div className={styles.matrixRow}>
          <UserCheck
            size={14}
            style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }}
          />
          <span>
            <strong>COLLABORATOR:</strong> Acceso operativo a galería multimedia, subida de activos
            autorizados y análisis en Data Studio.
          </span>
        </div>
      </div>
    </div>
  );
};
