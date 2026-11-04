export type Role = 'ADMIN' | 'MANAGER' | 'COLLABORATOR';

export interface User {
  id: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdById?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface UserSession {
  token: string;
  user: {
    id: string;
    username: string;
    role: Role;
    isActive?: boolean;
    createdById?: string | null;
  };
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role?: Role;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface LogoutResponse {
  message: string;
}

export interface RefreshResponse {
  token: string;
  user?: {
    id?: string;
    username?: string;
    role?: Role;
  };
}
