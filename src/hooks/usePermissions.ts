import { useAuth } from '../contexts/AuthContext';

export function usePermissions() {
  const { hasPermission, permissions, dataScope, canAccessScope, isSuperAdmin } = useAuth();
  
  return {
    hasPermission,
    permissions,
    dataScope,
    canAccessScope,
    isSuperAdmin
  };
}
