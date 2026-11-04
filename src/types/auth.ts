export type Role = 'ADMIN' | 'MANAGER' | 'COLLABORATOR' | 'USER';

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
