export type Role =
  | 'Super Admin'
  | 'Admin'
  | 'Manager'
  | 'Team Leader'
  | 'Counselor'
  | 'Accounts'
  | 'Partner'
  | 'University'
  | 'Marketing'
  | 'Viewer'
  | 'Admission Admin'
  | 'Admission Manager'
  | 'Admission Executive'
  | 'Academic Counselor'
  | 'HR Admin'
  | 'HR Manager'
  | 'HR Executive'
  | 'Finance Admin'
  | 'Finance Manager'
  | 'Finance Executive'
  | 'University Operations Manager';

export type DataScope = 'OWN' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'ORGANIZATION' | 'CUSTOM';

export interface Domain {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  phone?: string;
  department?: string;
  domain?: Domain | null;
  lastLogin?: string;
  isActive?: boolean;
  isSystemAdmin?: boolean;
  isDomainAdmin?: boolean;
  activeOrganizationId?: string;
  organizations?: Organization[];
  // Enterprise Org & RBAC
  department_id?: string | null;
  designation_id?: string | null;
  team_id?: string | null;
  manager_id?: string | null;
  access_profile_id?: string | null;
  dataScope?: DataScope;
  departmentName?: string;
  designationName?: string;
  teamName?: string;
  accessProfileName?: string;
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
