import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import {
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Moon,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/useAuth';
import { useTheme } from '../../context/useTheme';
import { useToast } from '../../context/useToast';
import { useHealthQuery } from '../../queries/useAdminQueries';
import { ApiError } from '../../services/apiClient';
import { RouteSkeleton } from '../shell/RouteSkeleton';
import { ServerUrlPopover } from './ServerUrlPopover';
import styles from './LoginPage.module.css';

interface LoginErrorState {
  message: string;
  tone: 'danger' | 'warn';
}

/**
 * Resuelve el mensaje y severidad de un error de inicio de sesión según RFC 7807 (`401`, `429`, red).
 */
function classifyLoginError(err: unknown): LoginErrorState {
  if (err instanceof ApiError) {
    if (err.status === 429 || err.code === 'RATE_LIMIT_EXCEEDED') {
      return {
        tone: 'warn',
        message:
          'Demasiados intentos seguidos (límite temporal excedido). Espera un momento antes de volver a intentarlo.',
      };
    }
    if (err.status === 401) {
      return {
        tone: 'danger',
        message: err.detail || 'Credenciales inválidas. Verifica tu usuario y contraseña.',
      };
    }
    if (err.status === 0 || err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT') {
      return {
        tone: 'warn',
        message:
          'No se pudo contactar al servidor API. Comprueba tu conexión o ajusta la URL en "Cambiar servidor API".',
      };
    }
    return {
      tone: 'danger',
      message: err.detail || err.message || 'No se pudo completar el inicio de sesión.',
    };
  }

  return {
    tone: 'danger',
    message:
      err instanceof Error
        ? err.message
        : 'Credenciales inválidas. Verifica tu usuario y contraseña.',
  };
}

/**
 * Pantalla de inicio de sesión 100% real contra `monolith-backend` (`/login`)
 * con estética "Archivo Editorial", tema dual, indicador `/health` y selector de servidor API.
 */
export const LoginPage: React.FC = () => {
  const { isAuthenticated, isCheckingSession, login } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const healthQuery = useHealthQuery(!isAuthenticated && !isCheckingSession);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorState, setErrorState] = useState<LoginErrorState | null>(null);

  const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)
    ?.from;
  const fromPath = from?.pathname
    ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
    : '/';

  if (isCheckingSession) {
    return <RouteSkeleton variant="fullscreen" label="Verificando sesión..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={fromPath} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorState({
        tone: 'danger',
        message: 'Ingresa tu nombre de usuario y contraseña para continuar.',
      });
      return;
    }

    setErrorState(null);
    setSubmitting(true);

    try {
      await login({ username: trimmedUser, password });
      showToast(`Bienvenido, ${trimmedUser}`, 'success');
      navigate(fromPath, { replace: true });
    } catch (err: unknown) {
      setErrorState(classifyLoginError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const health = healthQuery.data;
  const isHealthLoading = healthQuery.isLoading;
  const isOnline = health?.status === 'ok';

  return (
    <div className={styles.page} data-testid="login-page">
      <div className={styles.topBar}>
        <Button
          variant="ghost"
          size="sm"
          icon={resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          onClick={toggleTheme}
          aria-label={
            resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
          }
        >
          {resolvedTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </Button>
      </div>

      <main className={styles.center}>
        <section className={styles.sheet} aria-labelledby="login-heading">
          <h1 id="login-heading" className={styles.heading}>
            Iniciar sesión
          </h1>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {errorState ? (
              <div
                role="alert"
                className={`${styles.alert} ${
                  errorState.tone === 'warn' ? styles.alertWarn : styles.alertDanger
                }`}
              >
                <span className={styles.alertIcon} aria-hidden="true">
                  {errorState.tone === 'warn' ? <Clock size={16} /> : <AlertCircle size={16} />}
                </span>
                <span>{errorState.message}</span>
              </div>
            ) : null}

            <Input
              label="Usuario"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="ej. admin o colaborador"
              leadingIcon={<UserIcon size={15} />}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorState) setErrorState(null);
              }}
              disabled={submitting}
              autoFocus
              required
            />

            <Input
              label="Contraseña"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••••••"
              leadingIcon={<Lock size={15} />}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorState) setErrorState(null);
              }}
              disabled={submitting}
              required
              trailingElement={
                <button
                  type="button"
                  className={styles.passToggle}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            <div className={styles.submitRow}>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                icon={<LogIn size={16} />}
                loading={submitting}
              >
                {submitting ? 'Verificando acceso...' : 'Entrar al espacio'}
              </Button>
            </div>
          </form>

          <footer className={styles.footer}>
            <span className={styles.healthStatus} role="status" aria-live="polite">
              <span
                className={`${styles.dot} ${
                  isHealthLoading
                    ? styles.dotLoading
                    : isOnline
                    ? styles.dotOk
                    : styles.dotDegraded
                }`}
                aria-hidden="true"
              />
              {isHealthLoading
                ? 'Verificando API...'
                : isOnline
                ? `API en línea · ${health.latencyMs ?? 0} ms`
                : 'API sin conexión'}
            </span>

            <ServerUrlPopover />
          </footer>
        </section>
      </main>
    </div>
  );
};
