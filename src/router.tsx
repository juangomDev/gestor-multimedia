import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { useAuth } from './context/useAuth';
import { LoginPage } from './features/auth/LoginPage';
import { AppLayout } from './features/shell/AppLayout';
import { RouteSkeleton } from './features/shell/RouteSkeleton';
import { ExplorerPage } from './features/explorer/ExplorerPage';
import type { Role } from './types/auth';

const DataStudioPage = lazy(() => import('./features/data-studio/DataStudioPage'));
const FormInboxPage = lazy(() => import('./features/forms/FormInboxPage'));
const DataChatPage = lazy(() => import('./features/chat/DataChatPage'));
const TeamPage = lazy(() => import('./features/team/TeamPage'));
const AdminPage = lazy(() => import('./features/admin/AdminPage'));

/**
 * Guarda de ruta autenticada: espera a que concluya la verificación de sesión (`/auth/me`)
 * y redirige a `/login` conservando la ubicación solicitada si no hay sesión activa.
 */
export const RequireAuth: React.FC = () => {
  const { isAuthenticated, isCheckingSession } = useAuth();
  const location = useLocation();

  if (isCheckingSession) {
    return <RouteSkeleton variant="fullscreen" label="Verificando sesión..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Propiedades de la guarda de autorización por rol RBAC (`RequireRole`).
 */
export interface RequireRoleProps {
  /** Lista de roles autorizados para acceder a las rutas hijas. */
  allowedRoles: Role[];
}

/**
 * Guarda de ruta por rol RBAC (`MANAGER`/`ADMIN` en `/team`, exclusivo `ADMIN` en `/admin/*`).
 * Redirige de forma segura al explorador raíz (`/`) cuando el rol actual no está permitido.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

/**
 * Árbol declarativo de rutas SPA v2 (exportado independientemente del `BrowserRouter`
 * para pruebas rápidas y deterministas con `MemoryRouter`).
 */
export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />

    <Route element={<RequireAuth />}>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ExplorerPage />} />
        <Route path="/folder/:folderId" element={<ExplorerPage />} />

        <Route
          path="/tables/:shortCode"
          element={
            <Suspense fallback={<RouteSkeleton label="Cargando Data Studio..." />}>
              <DataStudioPage />
            </Suspense>
          }
        />

        <Route
          path="/folder/:folderId/forms/:formId"
          element={
            <Suspense fallback={<RouteSkeleton label="Cargando formulario..." />}>
              <FormInboxPage />
            </Suspense>
          }
        />

        <Route
          path="/chat"
          element={
            <Suspense fallback={<RouteSkeleton label="Cargando Data Chat..." />}>
              <DataChatPage />
            </Suspense>
          }
        />

        <Route element={<RequireRole allowedRoles={['MANAGER', 'ADMIN']} />}>
          <Route
            path="/team"
            element={
              <Suspense fallback={<RouteSkeleton label="Cargando Mi equipo..." />}>
                <TeamPage />
              </Suspense>
            }
          />
        </Route>

        <Route element={<RequireRole allowedRoles={['ADMIN']} />}>
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<RouteSkeleton label="Cargando Sistema y API..." />}>
                <AdminPage />
              </Suspense>
            }
          />
        </Route>
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

/**
 * Enrutador SPA principal sobre `BrowserRouter` con soporte para recargas limpias en producción
 * (`nginx.conf` / `public/_redirects`).
 */
export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);
