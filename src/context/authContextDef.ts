import { createContext } from 'react';
import type { LoginCredentials, User, CreateUserInput, Role } from '../types/auth';

export interface AuthContextValue {
  user: { id: string; username: string; role: Role } | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginAsLocalAdmin: () => void;
  logout: () => void;
  createUser: (input: CreateUserInput) => Promise<{ user: User }>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
