import React, { useState } from 'react';
import { LogIn, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginModal.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login({ username: username.trim(), password });
      setUsername('');
      setPassword('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Iniciar Sesión en Dokploy Drive">
      <form onSubmit={handleSubmit} className={styles.form} data-testid="login-form">
        {error && (
          <div className={styles.error} role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="login-username" className={styles.label}>
            Usuario
          </label>
          <input
            id="login-username"
            type="text"
            className={styles.input}
            placeholder="ej. admin o usuario1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="login-password" className={styles.label}>
            Contraseña
          </label>
          <input
            id="login-password"
            type="password"
            className={styles.input}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading} icon={<LogIn size={16} />}>
            {loading ? 'Accediendo...' : 'Iniciar Sesión'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
