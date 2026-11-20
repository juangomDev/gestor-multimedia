import { createContext } from 'react';
import type { LoginCredentials, Role } from '../types/auth';

/**
 * Datos básicos del usuario autenticado expuestos por `AuthContext`.
 */
export interface AuthContextUser {
  id: string;
  username: string;
  role: Role;
  isActive?: boolean;
  createdById?: string | null;
}

/**
 * Contrato del contexto global de autenticación real (100% conectado a `monolith-backend`).
 */
export interface AuthContextValue {
  user: AuthContextUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isCheckingSession: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/** Contexto React para el estado de sesión y operaciones de autenticación. */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
