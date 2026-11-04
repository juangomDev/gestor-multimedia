import { createContext } from 'react';
import type { LoginCredentials, User, CreateUserInput, Role } from '../types/auth';

export interface AuthContextUser {
  id: string;
  username: string;
  role: Role;
  isActive?: boolean;
  createdById?: string | null;
}

export interface AuthContextValue {
  user: AuthContextUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginAsLocalAdmin: () => void;
  logout: () => Promise<void>;
  createUser: (input: CreateUserInput) => Promise<{ user: User }>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
