export type Role = 'Super Admin' | 'Admin' | 'Counselor' | 'Accounts' | 'Partner' | 'University' | 'Marketing' | 'Viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  phone?: string;
  department?: string;
  lastLogin?: string;
  isActive?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
