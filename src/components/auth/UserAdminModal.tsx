import React, { useState } from 'react';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import styles from './UserAdminModal.module.css';

interface UserAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserAdminModal: React.FC<UserAdminModalProps> = ({ isOpen, onClose }) => {
  const { createUser, isAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || password.length < 6) {
      setError('El usuario debe tener al menos 3 caracteres y la contraseña al menos 6.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await createUser({
        username: username.trim(),
        password,
        role: 'USER',
      });
      setSuccess(`Usuario '${res.user.username}' creado exitosamente.`);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Panel de Administración: Crear Usuario">
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.error} role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={styles.success} role="status">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="new-username" className={styles.label}>
            Nombre de Usuario
          </label>
          <input
            id="new-username"
            type="text"
            className={styles.input}
            placeholder="ej. editor_marketing"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="new-password" className={styles.label}>
            Contraseña (mínimo 6 caracteres)
          </label>
          <input
            id="new-password"
            type="password"
            className={styles.input}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Rol asignado:</span>
          <span className={styles.badge}>USER (Colaborador)</span>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cerrar
          </Button>
          <Button type="submit" variant="primary" disabled={loading} icon={<UserPlus size={16} />}>
            {loading ? 'Creando...' : 'Crear Usuario'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
