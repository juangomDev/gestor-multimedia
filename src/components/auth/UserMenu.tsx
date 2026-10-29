import React, { useState } from 'react';
import { LogIn, LogOut, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { LoginModal } from './LoginModal';
import { UserAdminModal } from './UserAdminModal';
import styles from './UserMenu.module.css';

export const UserMenu: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  return (
    <div className={styles.container}>
      {isAuthenticated && user ? (
        <>
          <div className={styles.profilePill}>
            <div className={styles.avatar}>{user.username.charAt(0)}</div>
            <div className={styles.userInfo}>
              <span className={styles.username}>{user.username}</span>
              <span className={isAdmin ? styles.roleAdmin : styles.roleUser}>
                {user.role}
              </span>
            </div>
          </div>

          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              icon={<UserPlus size={14} />}
              onClick={() => setIsAdminOpen(true)}
              title="Crear nuevo usuario"
            >
              Nuevo Usuario
            </Button>
          )}

          <button
            onClick={logout}
            className={styles.logoutBtn}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>

          <UserAdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
        </>
      ) : (
        <Button
          variant="primary"
          size="sm"
          icon={<LogIn size={14} />}
          onClick={() => setIsLoginOpen(true)}
        >
          Iniciar Sesión
        </Button>
      )}

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};
