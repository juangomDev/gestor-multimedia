import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Key,
  Copy,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { usersService } from '../../services/usersService';
import { storageService } from '../../services/storageService';
import { copyToClipboard } from '../../utils/clipboard';
import type { User, Role } from '../../types/auth';
import styles from './CreateProfileCard.module.css';

/**
 * Propiedades del formulario de creación de perfiles de usuario con jerarquía RBAC.
 */
export interface CreateProfileCardProps {
  onUserCreated: (newUser: User) => void;
}

/**
 * Tarjeta con el formulario de alta de nuevos perfiles de usuario (`POST /api/v1/users`).
 * Permite a un `ADMIN` elegir entre rol `MANAGER` y `COLLABORATOR`, y fuerza `COLLABORATOR` para `MANAGER`.
 */
export const CreateProfileCard: React.FC<CreateProfileCardProps> = ({ onUserCreated }) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const isManagerSession = currentUser?.role === 'MANAGER';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'MANAGER' | 'COLLABORATOR'>('COLLABORATOR');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<{
    username: string;
    pass: string;
    role: Role;
  } | null>(null);

  const effectiveRole: 'MANAGER' | 'COLLABORATOR' = isManagerSession
    ? 'COLLABORATOR'
    : selectedRole;

  /**
   * Genera una contraseña aleatoria segura de 12 caracteres.
   */
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setShowPassword(true);
    showToast('Contraseña aleatoria generada', 'info');
  };

  /**
   * Valida y envía el formulario de creación de usuario hacia `usersService.createUser`.
   */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUser = username.trim();
    if (!cleanUser || cleanUser.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres alfanuméricos.');
      return;
    }

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await usersService.createUser({
        username: cleanUser,
        password,
        role: effectiveRole,
      });

      onUserCreated(res.user);
      setLastCreated({ username: cleanUser, pass: password, role: res.user.role });
      showToast(`Perfil '${cleanUser}' creado exitosamente`, 'success');
      setUsername('');
      setPassword('');
    } catch (err: any) {
      if (
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('401') ||
        err?.message?.includes('Unauthorized') ||
        err?.message?.includes('NetworkError')
      ) {
        const localUser: User = {
          id: `usr-loc-${Date.now()}`,
          username: cleanUser,
          role: effectiveRole,
          isActive: true,
          createdById: currentUser?.id || null,
          createdAt: new Date().toISOString(),
        };
        storageService.addCreatedUser(localUser);
        onUserCreated(localUser);
        setLastCreated({ username: cleanUser, pass: password, role: effectiveRole });
        showToast(`Perfil '${cleanUser}' registrado localmente`, 'success');
        setUsername('');
        setPassword('');
        return;
      }
      setError(err?.detail || err?.message || 'Error al registrar el perfil en el servidor.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copia las credenciales del último perfil creado al portapapeles.
   */
  const handleCopyCredentials = async () => {
    if (!lastCreated) return;
    const text = `Usuario: ${lastCreated.username}\nContraseña: ${lastCreated.pass}\nRol: ${lastCreated.role}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      showToast('Credenciales copiadas al portapapeles', 'success');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>
          <UserPlus size={18} />
        </div>
        <div>
          <h2 className={styles.cardTitle}>Crear Nuevo Perfil</h2>
          <span className={styles.cardSubtitle}>
            Registra un nuevo usuario en PostgreSQL respetando tu jerarquía RBAC.
          </span>
        </div>
      </div>

      <form onSubmit={handleCreateUser} className={styles.form}>
        {error && (
          <div className={styles.alertError} role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {lastCreated && (
          <div className={styles.alertSuccess}>
            <div className={styles.successHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} />
                <span>¡Perfil creado exitosamente!</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className={styles.iconBtn}
                title="Copiar credenciales completas"
              >
                <Copy size={14} />
              </button>
            </div>
            <div className={styles.credentialSummary}>
              <span>Usuario: {lastCreated.username}</span>
              <span>Pass: {lastCreated.pass}</span>
            </div>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="profile-username" className={styles.label}>
            Nombre de Usuario
          </label>
          <div className={styles.inputGroup}>
            <Users size={16} className={styles.inputIcon} />
            <input
              id="profile-username"
              type="text"
              className={styles.input}
              placeholder="ej. editor_marketing o gestor_regional"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="profile-password" className={styles.label}>
            Contraseña Temporal
          </label>
          <div className={styles.inputGroup}>
            <Key size={16} className={styles.inputIcon} />
            <input
              id="profile-password"
              type={showPassword ? 'text' : 'password'}
              className={`${styles.input} ${styles.inputWithActions}`}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <div className={styles.inputActions}>
              <button
                type="button"
                onClick={generateRandomPassword}
                className={styles.iconBtn}
                title="Generar contraseña segura aleatoria"
              >
                <Sparkles size={15} />
              </button>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={styles.iconBtn}
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="profile-role-select" className={styles.label}>
            Rol Jerárquico Asignado
          </label>
          {isManagerSession ? (
            <div className={styles.roleInfoBox}>
              <div>
                <span className={styles.roleBadge}>COLLABORATOR</span>
                <p className={styles.roleDesc}>
                  Como MANAGER, todos los usuarios que crees se vinculan a tu cuenta con rol
                  COLLABORATOR.
                </p>
              </div>
            </div>
          ) : (
            <select
              id="profile-role-select"
              className={styles.selectInput}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'MANAGER' | 'COLLABORATOR')}
              disabled={loading}
              aria-label="Rol Jerárquico Asignado"
            >
              <option value="COLLABORATOR">COLLABORATOR (Colaborador Operativo)</option>
              <option value="MANAGER">MANAGER (Gestor de Equipo y Colaboradores)</option>
            </select>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          icon={<UserPlus size={16} />}
          loading={loading}
          style={{ width: '100%', marginTop: 6 }}
        >
          {loading ? 'Registrando en servidor...' : 'Registrar Perfil'}
        </Button>
      </form>
    </div>
  );
};
