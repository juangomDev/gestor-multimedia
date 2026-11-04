import React, { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { usersService } from '../services/usersService';
import { storageService } from '../services/storageService';
import { CreateProfileCard } from '../components/users/CreateProfileCard';
import { ProfilesDirectoryCard } from '../components/users/ProfilesDirectoryCard';
import { ResetUserPasswordModal } from '../components/users/ResetUserPasswordModal';
import { DeleteUserModal } from '../components/users/DeleteUserModal';
import type { User } from '../types/auth';
import styles from './UserProfilesView.module.css';

/**
 * Propiedades de la vista de gestión jerárquica de usuarios RBAC.
 */
export interface UserProfilesViewProps {
  onBackToGallery?: () => void;
}

/**
 * Vista orquestadora para la administración jerárquica de usuarios (`ADMIN > MANAGER > COLLABORATOR`)
 * conectada en vivo con PostgreSQL mediante `usersService`.
 */
export const UserProfilesView: React.FC<UserProfilesViewProps> = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [profiles, setProfiles] = useState<User[]>(() => storageService.getCreatedUsers());
  const [loadingList, setLoadingList] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  /**
   * Carga el listado dinámico de usuarios desde `GET /api/v1/users`.
   */
  const loadUsersFromServer = useCallback(async () => {
    setLoadingList(true);
    try {
      const remoteUsers = await usersService.listUsers();
      setProfiles(remoteUsers);
    } catch {
      setProfiles(storageService.getCreatedUsers());
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    usersService
      .listUsers()
      .then((remoteUsers) => {
        if (active) setProfiles(remoteUsers);
      })
      .catch(() => {
        if (active) setProfiles(storageService.getCreatedUsers());
      });
    return () => {
      active = false;
    };
  }, []);

  /**
   * Inserta o actualiza el usuario recién creado en la lista activa.
   */
  const handleUserCreated = (newUser: User) => {
    setProfiles((prev) => [
      newUser,
      ...prev.filter((u) => u.id !== newUser.id && u.username !== newUser.username),
    ]);
  };

  /**
   * Alterna en 1 clic el estado `Activo` / `Suspendido` de un usuario (`PATCH /api/v1/users/:id/status`).
   */
  const handleToggleStatus = async (targetUser: User) => {
    const nextStatus = !targetUser.isActive;
    try {
      const res = await usersService.updateUserStatus(targetUser.id, nextStatus);
      setProfiles((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: res.user.isActive } : u))
      );
      showToast(
        `Usuario '${targetUser.username}' ${nextStatus ? 'reactivado' : 'suspendido'}`,
        'info'
      );
    } catch (err: any) {
      showToast(
        err?.detail || err?.message || `No se pudo cambiar el estado de '${targetUser.username}'`,
        'error'
      );
    }
  };

  /**
   * Elimina permanentemente un usuario y sus archivos en cascada (`DELETE /api/v1/users/:id`).
   */
  const handleConfirmDelete = async (targetUser: User) => {
    try {
      await usersService.deleteUser(targetUser.id);
      setProfiles((prev) => prev.filter((u) => u.id !== targetUser.id));
      showToast(`Usuario '${targetUser.username}' eliminado permanentemente`, 'info');
    } catch (err: any) {
      showToast(
        err?.detail || err?.message || `Error al eliminar a '${targetUser.username}'`,
        'error'
      );
    }
  };

  const panelBadgeLabel =
    currentUser?.role === 'MANAGER' ? 'Panel de Gestor (MANAGER)' : 'Panel de Administrador';

  return (
    <div className={styles.container} data-testid="user-profiles-view">
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleBadgeRow}>
            <h1 className={styles.title}>Gestión de Perfiles</h1>
            <span className={styles.adminPill}>
              <Shield size={12} />
              {panelBadgeLabel}
            </span>
          </div>
          <span className={styles.subtitle}>
            Crea y administra perfiles de colaboradores para otorgar acceso al gestor multimedia.
          </span>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <CreateProfileCard onUserCreated={handleUserCreated} />
        <ProfilesDirectoryCard
          profiles={profiles}
          loading={loadingList}
          onRefresh={loadUsersFromServer}
          onToggleStatus={handleToggleStatus}
          onOpenResetPassword={setResettingUser}
          onOpenDeleteUser={setDeletingUser}
        />
      </div>

      <ResetUserPasswordModal
        user={resettingUser}
        isOpen={!!resettingUser}
        onClose={() => setResettingUser(null)}
      />

      <DeleteUserModal
        user={deletingUser}
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};
