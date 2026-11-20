import React, { useState } from 'react';
import { AlertCircle, KeyRound } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { useToast } from '../../context/useToast';
import styles from './ChangePasswordDialog.module.css';

/**
 * Propiedades del diálogo editorial de cambio de contraseña propia (`PATCH /api/v1/auth/password`).
 */
export interface ChangePasswordDialogProps {
  /** Controla la apertura del diálogo. */
  open: boolean;
  /** Callback de cambio de estado abierto/cerrado. */
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo accesible sobre Radix Dialog para actualizar la contraseña de la sesión activa.
 */
export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackedOpen, setTrackedOpen] = useState(open);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  if (trackedOpen !== open) {
    setTrackedOpen(open);
    resetForm();
  }

  const handleOpenChange = (nextOpen: boolean) => {
    resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword) {
      setError('Ingresa tu contraseña actual.');
      return;
    }
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      showToast('Contraseña actualizada correctamente', 'success');
      handleOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const message = err instanceof Error ? err.message : undefined;
      setError(detail || message || 'No se pudo actualizar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Cambiar contraseña"
      description="Actualiza tu clave de acceso sin cerrar la sesión actual."
      size="sm"
    >
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {error ? (
          <div role="alert" className={styles.alert}>
            <span className={styles.alertIcon} aria-hidden="true">
              <AlertCircle size={15} />
            </span>
            <span>{error}</span>
          </div>
        ) : null}

        <Input
          label="Contraseña actual"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={submitting}
          autoFocus
        />

        <Input
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 6 caracteres."
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={submitting}
        />

        <Input
          label="Confirmar nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={submitting}
        />

        <div className={styles.footerActions}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<KeyRound size={15} />}
            loading={submitting}
          >
            Guardar clave
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
