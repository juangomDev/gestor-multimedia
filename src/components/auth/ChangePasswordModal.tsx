import React, { useState } from 'react';
import { KeyRound, X, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import styles from './ChangePasswordModal.module.css';

export interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Por favor introduce tu contraseña actual.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente a la contraseña actual.');
      return;
    }

    setLoading(true);

    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
      });

      showToast(res.message || 'Contraseña actualizada exitosamente', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const detail =
        err?.detail ||
        err?.message ||
        'Error al cambiar la contraseña. Verifica tu clave actual.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <KeyRound size={18} />
            </div>
            <div>
              <h2 id="change-password-title" className={styles.title}>
                Cambiar Contraseña
              </h2>
              <p className={styles.subtitle}>
                Usuario: <strong>{user?.username || 'Activo'}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.alertError} role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="current-password-input" className={styles.label}>
              Contraseña Actual
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="current-password-input"
                type={showCurrent ? 'text' : 'password'}
                className={styles.input}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Tu clave actual"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Ocultar clave actual' : 'Ver clave actual'}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="new-password-input" className={styles.label}>
              Nueva Contraseña
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="new-password-input"
                type={showNew ? 'text' : 'password'}
                className={styles.input}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Ocultar nueva clave' : 'Ver nueva clave'}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className={styles.hint}>Debe tener al menos 6 caracteres</span>
          </div>

          <div className={styles.field}>
            <label htmlFor="confirm-password-input" className={styles.label}>
              Confirmar Nueva Contraseña
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="confirm-password-input"
                type={showConfirm ? 'text' : 'password'}
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva clave"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Ocultar confirmación' : 'Ver confirmación'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Actualizar Contraseña</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
