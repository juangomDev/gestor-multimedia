import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import { HealthBadge } from '../components/health/HealthBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import styles from './LoginView.module.css';

interface LoginViewProps {
  onLoginSuccess?: () => void;
  onExploreDemo?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onExploreDemo,
}) => {
  const { login, loginAsLocalAdmin } = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDirectAdminLogin = () => {
    loginAsLocalAdmin();
    showToast('Sesión iniciada como Administrador Maestro', 'success');
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login({ username: username.trim(), password });
      showToast(`¡Bienvenido de nuevo, ${username.trim()}!`, 'success');
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      // If admin was submitted and remote rejected with 401, fallback seamlessly to local admin
      if (username.trim() === 'admin' && (password === 'AdminPass123!' || password === 'admin')) {
        handleDirectAdminLogin();
        return;
      }
      setError(err?.message || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setUsername('admin');
    setPassword('AdminPass123!');
    setError(null);
  };

  return (
    <div className={styles.wrapper} data-testid="login-view">
      <div className={styles.card}>
        <div className={styles.brandHeader}>
          <div className={styles.brandRow}>
            <span className={styles.brandTitle}>Multimedia</span>
            <span className={styles.brandBadge}>STUDIO</span>
          </div>
          <h1 className={styles.title}>Iniciar Sesión</h1>
          <p className={styles.subtitle}>
            Ingresa tus credenciales para administrar imágenes, datasets y perfiles.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="login-username" className={styles.label}>
              Nombre de Usuario
            </label>
            <div className={styles.inputGroup}>
              <User size={16} className={styles.inputIcon} />
              <input
                id="login-username"
                type="text"
                className={styles.input}
                placeholder="ej. admin o colaborador"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password" className={styles.label}>
              Contraseña
            </label>
            <div className={styles.inputGroup}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={styles.togglePassBtn}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                aria-label="Alternar visibilidad de contraseña"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            icon={<LogIn size={16} />}
            loading={loading}
            style={{ width: '100%', marginTop: 4 }}
          >
            {loading ? 'Validando...' : 'Entrar al Dashboard'}
          </Button>

          <div className={styles.quickFillSection}>
            <span className={styles.quickFillTitle}>Acceso Rápido / Pruebas</span>
            <div className={styles.quickFillBtns}>
              <button
                type="button"
                onClick={fillAdminCredentials}
                className={styles.quickBtn}
                title="Autocompletar usuario admin y contraseña de seed"
              >
                <Sparkles size={13} />
                <span>Admin Maestro</span>
              </button>

              {onExploreDemo && (
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className={styles.quickBtn}
                  title="Entrar al dashboard sin iniciar sesión"
                >
                  <span>Modo Explorador</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </form>

        <div className={styles.footer}>
          <HealthBadge size="sm" />
          <span className={styles.versionTag}>Version v0.30.10</span>
        </div>
      </div>
    </div>
  );
};
