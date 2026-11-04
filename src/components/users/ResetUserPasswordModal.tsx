import React, { useState } from 'react';
import { Key, Sparkles, Copy, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { usersService } from '../../services/usersService';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/useToast';
import type { User } from '../../types/auth';
import styles from './UserProfilesCards.module.css';

/**
 * Propiedades del modal de restablecimiento de contraseña por superior jerárquico.
 */
export interface ResetUserPasswordModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal que permite a un `ADMIN` o `MANAGER` restablecer la contraseña de un usuario subordinado
 * (`PATCH /api/v1/users/:id/password`), con generador de claves seguras y botón copiar.
 */
export const ResetUserPasswordModal: React.FC<ResetUserPasswordModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  /**
   * Genera una contraseña aleatoria segura de 12 caracteres y la muestra en el campo.
   */
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setShowPassword(true);
    setError(null);
    showToast('Contraseña segura generada', 'info');
  };

  /**
   * Copia la nueva contraseña ingresada al portapapeles.
   */
  const handleCopyPassword = async () => {
    if (!newPassword) return;
    const ok = await copyToClipboard(newPassword);
    if (ok) {
      showToast('Nueva contraseña copiada al portapapeles', 'success');
    }
  };

  /**
   * Envía la solicitud `PATCH /api/v1/users/:id/password` al backend.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await usersService.resetUserPassword(user.id, newPassword);
      showToast(
        res.message || `Contraseña de '${user.username}' restablecida exitosamente`,
        'success'
      );
      setNewPassword('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.detail || err?.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Restablecer contraseña: ${user.username}`}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.alertError} role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
          Asigna una nueva clave de acceso para <strong>{user.username}</strong> ({user.role}).
          Esta acción revocará las sesiones activas previas del usuario.
        </p>

        <div className={styles.field}>
          <label htmlFor="reset-user-password-input" className={styles.label}>
            Nueva Contraseña Asignada
          </label>
          <div className={styles.inputGroup}>
            <Key size={16} className={styles.inputIcon} />
            <input
              id="reset-user-password-input"
              type={showPassword ? 'text' : 'password'}
              className={`${styles.input} ${styles.inputWithActions}`}
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <div className={styles.inputActions}>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className={styles.iconBtn}
                title="Generar contraseña segura aleatoria"
                aria-label="Generar contraseña aleatoria"
              >
                <Sparkles size={15} />
              </button>
              <button
                type="button"
                onClick={handleCopyPassword}
                className={styles.iconBtn}
                title="Copiar nueva contraseña"
                aria-label="Copiar nueva contraseña"
                disabled={!newPassword}
              >
                <Copy size={15} />
              </button>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={styles.iconBtn}
                title={showPassword ? 'Ocultar' : 'Mostrar'}
                aria-label="Alternar visibilidad de nueva contraseña"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<CheckCircle2 size={15} />}
            loading={loading}
          >
            {loading ? 'Guardando...' : 'Confirmar Nueva Clave'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

