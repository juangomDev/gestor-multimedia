import React, { useId, useState } from 'react';
import { RefreshCw, UserPlus } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { useCreateUserMutation } from '../../queries/useAdminQueries';
import { generateTemporaryPassword, getCreatableRoles } from './userRules';
import type { Role } from '../../types/auth';
import styles from './TeamDialogs.module.css';

/**
 * Propiedades del diálogo de alta de colaboradores/gestores (`CreateUserDialog`).
 */
export interface CreateUserDialogProps {
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor de equipo (MANAGER)',
  COLLABORATOR: 'Colaborador (COLLABORATOR)',
};

/**
 * Modal de creación de usuarios (`POST /api/v1/users`) que aplica la jerarquía RBAC:
 * - `MANAGER`: únicamente puede crear `COLLABORATOR`.
 * - `ADMIN`: puede crear `COLLABORATOR` o `MANAGER`.
 */
export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({ open, onOpenChange }) => {
  const formId = useId();
  const roleSelectId = useId();
  const { user } = useAuth();
  const { showToast } = useToast();
  const createUser = useCreateUserMutation();

  const allowedRoles = getCreatableRoles(user?.role);
  const defaultRole: Role = allowedRoles[0] ?? 'COLLABORATOR';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(defaultRole);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reset = () => {
    setUsername('');
    setPassword('');
    setRole(defaultRole);
    setErrorMsg(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (cleanUser.length < 3) {
      setErrorMsg('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }
    if (/\s/.test(cleanUser)) {
      setErrorMsg('El nombre de usuario no puede contener espacios.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('La contraseña inicial debe tener al menos 6 caracteres.');
      return;
    }

    const effectiveRole = allowedRoles.includes(role) ? role : defaultRole;
    setErrorMsg(null);
    try {
      const res = await createUser.mutateAsync({
        username: cleanUser,
        password,
        role: effectiveRole,
      });
      showToast(`Usuario "${res.user.username}" creado correctamente.`, 'success');
      handleClose(false);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      const fallback = err instanceof Error ? err.message : 'No se pudo crear el usuario.';
      setErrorMsg(detail || fallback);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title={user?.role === 'ADMIN' ? 'Nuevo usuario' : 'Nuevo colaborador'}
      description="El usuario podrá iniciar sesión de inmediato con estas credenciales."
      size="sm"
      footer={
        <div className={styles.footerActions}>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={createUser.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            icon={<UserPlus size={14} />}
            loading={createUser.isPending}
            data-testid="create-user-submit-btn"
          >
            Crear cuenta
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <Input
          label="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ej. maria.gomez"
          autoFocus
          required
          mono
        />

        <div className={styles.inlineRow}>
          <div className={styles.grow}>
            <Input
              label="Contraseña inicial"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              mono
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<RefreshCw size={14} />}
            onClick={() => setPassword(generateTemporaryPassword())}
            aria-label="Generar contraseña aleatoria"
          >
            Generar
          </Button>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={roleSelectId} className={styles.label}>
            Rol jerárquico RBAC
          </label>
          <select
            id={roleSelectId}
            className={styles.select}
            value={allowedRoles.includes(role) ? role : defaultRole}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={allowedRoles.length <= 1}
            data-testid="create-user-role-select"
          >
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          {allowedRoles.length === 1 ? (
            <span className={styles.hint}>
              Como Gestor de equipo, los nuevos miembros se registran como Colaboradores.
            </span>
          ) : null}
        </div>

        {errorMsg ? (
          <div className={styles.errorBox} role="alert">
            {errorMsg}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
};
