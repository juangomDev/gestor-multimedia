import React from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../context/useAuth';
import styles from './SettingsCards.module.css';

/**
 * Propiedades para la tarjeta de perfil y seguridad de sesión.
 */
export interface ProfileSecurityCardProps {
  onOpenChangePassword?: () => void;
}

/**
 * Tarjeta que muestra la cuenta activa, el rol de sistema y el acceso al cambio de contraseña.
 */
export const ProfileSecurityCard: React.FC<ProfileSecurityCardProps> = ({
  onOpenChangePassword,
}) => {
  const { user } = useAuth();

  return (
    <section className={styles.card} aria-labelledby="user-profile-security-heading">
      <div className={styles.cardHeader}>
        <div className={`${styles.cardIcon} ${styles.cardIconPurple}`}>
          <ShieldCheck size={20} />
        </div>
        <div className={styles.cardHeaderTexts}>
          <h2 id="user-profile-security-heading" className={styles.cardTitle}>
            Mi Perfil & Seguridad
          </h2>
          <span className={styles.cardSubtitle}>
            Gestión de credenciales y datos de sesión activa en Monolith Backend.
          </span>
        </div>
      </div>

      <div className={styles.form}>
        <div className={styles.previewBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.previewLabel}>Usuario Activo</span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {user?.username || 'admin'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '10px',
            }}
          >
            <span className={styles.previewLabel}>Rol de Sistema</span>
            <span className={styles.badgePill}>{user?.role || 'ADMIN'}</span>
          </div>
        </div>

        <div className={styles.actions} style={{ justifyContent: 'flex-start' }}>
          <Button
            type="button"
            variant="primary"
            icon={<KeyRound size={16} />}
            onClick={onOpenChangePassword}
          >
            Cambiar Contraseña
          </Button>
        </div>
      </div>
    </section>
  );
};

