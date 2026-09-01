export type Role = 'Super Admin' | 'Admin' | 'Manager' | 'Team Leader' | 'Counselor' | 'Accounts' | 'Partner' | 'University' | 'Marketing' | 'Viewer';

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
  activeOrganizationId?: string;
  organizations?: Organization[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: string;
  crm_context?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
