import React from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { appQueryClient } from './queries/queryClient';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { TooltipProvider } from './components/ui/Tooltip';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppRouter } from './router';

/**
 * Propiedades del árbol de proveedores globales (`AppProviders`).
 */
export interface AppProvidersProps {
  /** Contenido hijo envuelto por los proveedores del sistema. */
  children: React.ReactNode;
  /** Instancia opcional de `QueryClient` (útil para inyectar caché aislada en tests). */
  queryClient?: QueryClient;
}

/**
 * Envuelve la aplicación con TanStack Query, ThemeProvider (Claro/Oscuro),
 * Radix TooltipProvider, AuthProvider real y ToastProvider editorial.
 */
export const AppProviders: React.FC<AppProvidersProps> = ({
  children,
  queryClient = appQueryClient,
}) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider delayDuration={240}>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary fallbackTitle="Ocurrió un problema inesperado en la aplicación">
              {children}
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

/**
 * Componente raíz de Gestor Multimedia v2 ("Archivo Editorial") con enrutamiento SPA `BrowserRouter`.
 */
export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
