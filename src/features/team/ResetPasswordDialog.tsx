import React, { useId, useState } from 'react';
import { Check, Copy, KeyRound, RefreshCw } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/useToast';
import { useResetUserPasswordMutation } from '../../queries/useAdminQueries';
import { copyToClipboard } from '../../utils/clipboard';
import { generateTemporaryPassword } from './userRules';
import type { User } from '../../types/auth';
import styles from './TeamDialogs.module.css';

/**
 * Propiedades del modal de restablecimiento de contraseña de un subordinado (`ResetPasswordDialog`).
 */
export interface ResetPasswordDialogProps {
  /** Usuario objetivo cuya clave será restablecida. */
  targetUser: User | null;
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal de restablecimiento forzado de contraseña (`PATCH /api/v1/users/:id/password`)
 * con generador aleatorio seguro y copia al portapapeles.
 */
export const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({
  targetUser,
  open,
  onOpenChange,
}) => {
  const formId = useId();
  const { showToast } = useToast();
  const resetPassword = useResetUserPasswordMutation();

  const [newPassword, setNewPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNewPassword('');
      setCopied(false);
      setErrorMsg(null);
    }
    onOpenChange(nextOpen);
  };

  const handleCopy = async () => {
    if (!newPassword) return;
    const ok = await copyToClipboard(newPassword);
    if (ok) {
      setCopied(true);
      showToast('Contraseña copiada al portapapeles.', 'success');
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (newPassword.trim().length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setErrorMsg(null);
    try {
      await resetPassword.mutateAsync({
        userId: targetUser.id,
        newPassword: newPassword.trim(),
      });
      showToast(`Contraseña de "${targetUser.username}" restablecida.`, 'success');
      handleClose(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.';
      setErrorMsg(detail || fallback);
    }
  };

  return (
    <Dialog
      open={open && Boolean(targetUser)}
      onOpenChange={handleClose}
      title={targetUser ? `Restablecer clave · ${targetUser.username}` : 'Restablecer clave'}
      description="Asigna una nueva contraseña temporal para este usuario."
      size="sm"
      footer={
        <div className={styles.footerActions}>
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={resetPassword.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            icon={<KeyRound size={14} />}
            loading={resetPassword.isPending}
            data-testid="reset-password-submit-btn"
          >
            Guardar clave
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.inlineRow}>
          <div className={styles.grow}>
            <Input
              label="Nueva contraseña"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              autoFocus
              mono
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<RefreshCw size={14} />}
            onClick={() => setNewPassword(generateTemporaryPassword())}
            data-testid="reset-password-generate-btn"
          >
            Generar
          </Button>
        </div>

        {newPassword ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={copied ? <Check size={13} /> : <Copy size={13} />}
            onClick={() => void handleCopy()}
          >
            {copied ? 'Copiada al portapapeles' : 'Copiar contraseña temporal'}
          </Button>
        ) : null}

        {errorMsg ? (
          <div className={styles.errorBox} role="alert">
            {errorMsg}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
};
