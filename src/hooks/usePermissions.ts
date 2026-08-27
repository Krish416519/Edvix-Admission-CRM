import { useAuth } from '../contexts/AuthContext';

export function usePermissions() {
  const { hasPermission, permissions } = useAuth();
  
  return {
    hasPermission,
    permissions
  };
}
