import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import styles from './ErrorBoundary.module.css';

/**
 * Propiedades de la barrera de errores (`ErrorBoundary`).
 */
export interface ErrorBoundaryProps {
  /** Contenido protegido por la barrera de captura. */
  children: React.ReactNode;
  /** Clave reactiva (p. ej. `location.pathname`) que restablece el error al cambiar de ruta. */
  resetKey?: string;
  /** Título personalizado mostrado en la tarjeta de recuperación. */
  fallbackTitle?: string;
  /** Callback opcional invocado al pulsar "Reintentar". */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  prevResetKey?: string;
}

/**
 * Barrera de errores React (`ErrorBoundary`) con estética "Archivo Editorial".
 * Captura fallos de renderizado o de carga de fragmentos `React.lazy`, evita pantallas
 * en blanco y permite reintentar la vista actual o recargar la aplicación.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, prevResetKey: props.resetKey };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    if (props.resetKey !== state.prevResetKey) {
      return state.hasError
        ? { hasError: false, error: null, prevResetKey: props.resetKey }
        : { prevResetKey: props.resetKey };
    }
    return null;
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = this.props.fallbackTitle || 'No se pudo mostrar esta sección';
    const detail =
      this.state.error?.message ||
      'Ocurrió un problema inesperado al cargar o renderizar el módulo.';

    return (
      <div className={styles.container} role="alert" data-testid="error-boundary-fallback">
        <div className={styles.card}>
          <span className={styles.iconWrap} aria-hidden="true">
            <AlertTriangle size={22} />
          </span>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{detail}</p>
          <div className={styles.actions}>
            <Button
              variant="primary"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={this.handleRetry}
              data-testid="error-boundary-retry-btn"
            >
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
