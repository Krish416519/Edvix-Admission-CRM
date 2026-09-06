import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role, DataScope } from '../types/auth';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  permissions: { action: string; resource: string }[];
  dataScope: DataScope;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
  hasPermission: (action: string, resource: string) => boolean;
  hasResourceAccess: (resource: string) => boolean;
  canAccessScope: (requiredScope: DataScope) => boolean;
  canAccessDomain: (domainName: string) => boolean;
  switchOrganization: (orgId: string) => void;
  isSuperAdmin: () => boolean;
  isDomainAdmin: (domainName?: string) => boolean;
  isActive: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback avatar for users without one
const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?u=a042581f4e29026704d';

const DEFAULT_ROLE_SCOPES: Record<string, DataScope> = {
  'Super Admin': 'ORGANIZATION',
  'Admin': 'ORGANIZATION',
  'Admission Admin': 'DEPARTMENT',
  'Admission Manager': 'DEPARTMENT',
  'Team Leader': 'TEAM',
  'Counselor': 'ASSIGNED',
  'Academic Counselor': 'ASSIGNED',
  'Admission Executive': 'ASSIGNED',
  'HR Admin': 'DEPARTMENT',
  'HR Manager': 'DEPARTMENT',
  'HR Executive': 'DEPARTMENT',
  'Marketing Admin': 'DEPARTMENT',
  'Marketing Manager': 'DEPARTMENT',
  'Marketing': 'DEPARTMENT',
  'Finance Admin': 'DEPARTMENT',
  'Finance Manager': 'DEPARTMENT',
  'Finance Executive': 'DEPARTMENT',
  'Accounts': 'DEPARTMENT',
  'Viewer': 'ASSIGNED',
  'Partner': 'OWN',
  'Student': 'OWN',
};

const SCOPE_HIERARCHY: Record<DataScope, number> = {
  'ORGANIZATION': 50,
  'DEPARTMENT': 40,
  'TEAM': 30,
  'ASSIGNED': 20,
  'OWN': 10,
  'CUSTOM': 25,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<{ action: string; resource: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const parseSupabaseUser = (sbUser: any, profileData?: any, orgData?: any[]): User => {
    const email = sbUser.email || '';
    
    // Role is pulled from the live DB (roles table) or falls back to 'Viewer'
    const role: Role = (profileData?.roles?.name as Role) || (sbUser.user_metadata?.role as Role) || 'Viewer';
    
    // Explicit Security Metadata
    const isSystemAdmin = profileData?.roles?.is_system_admin || profileData?.is_platform_super_admin || role === 'Super Admin' || false;
    const isDomainAdmin = profileData?.roles?.is_domain_admin ?? false;
    
    const name = profileData?.name || sbUser.user_metadata?.name || email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const avatar = sbUser.user_metadata?.avatar_url || profileData?.avatar_url || DEFAULT_AVATAR;

    let organizations = [];
    let activeOrgId = undefined;
    
    if (orgData && orgData.length > 0) {
      organizations = orgData.map(ou => ou.organizations).filter(Boolean);
      const savedOrgId = localStorage.getItem('activeOrganizationId');
      if (savedOrgId && organizations.some((org: any) => org.id === savedOrgId)) {
        activeOrgId = savedOrgId;
      } else {
        activeOrgId = organizations[0]?.id;
        if (activeOrgId) localStorage.setItem('activeOrganizationId', activeOrgId);
      }
    }

    const dataScope: DataScope = isSystemAdmin
      ? 'ORGANIZATION'
      : (profileData?.access_profiles?.data_scope || DEFAULT_ROLE_SCOPES[role] || 'ASSIGNED');

    return {
      id: sbUser.id,
      email,
      name,
      role,
      avatar,
      phone: profileData?.phone,
      department: profileData?.departments?.name || profileData?.department || '',
      department_id: profileData?.department_id || null,
      designation_id: profileData?.designation_id || null,
      team_id: profileData?.team_id || null,
      manager_id: profileData?.manager_id || null,
      access_profile_id: profileData?.access_profile_id || null,
      dataScope,
      departmentName: profileData?.departments?.name,
      designationName: profileData?.designations?.name,
      teamName: profileData?.teams?.name,
      accessProfileName: profileData?.access_profiles?.name,
      domain: profileData?.domains || null,
      lastLogin: profileData?.last_login,
      isActive: profileData?.is_active ?? true,
      isSystemAdmin,
      isDomainAdmin,
      activeOrganizationId: activeOrgId,
      organizations
    };
  };

  useEffect(() => {
    let mounted = true;

    const fetchUserProfile = async (userId: string) => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*, roles(name, is_system_admin, is_domain_admin), domains(id, name, slug)')
          .eq('id', userId)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching user profile:', profileError);
        }
        
        // Fetch organizations
        const { data: orgData, error: orgError } = await supabase
          .from('organization_users')
          .select('*, organizations(*)')
          .eq('user_id', userId)
          .eq('status', 'Active');

        if (orgError) {
          console.error('Error fetching organizations:', orgError);
        }

        // Fetch permissions
        const { data: permsData, error: permsError } = await supabase.rpc('get_user_permissions', { p_user_id: userId });
        if (permsError) {
          console.error('Error fetching permissions:', permsError);
        } else if (permsData) {
          setPermissions(permsData);
        }

        return { profileData: profileData || null, orgData: orgData || [] };
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        return { profileData: null, orgData: [] };
      }
    };

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user && mounted) {
          const { profileData, orgData } = await fetchUserProfile(session.user.id);
          const newUser = parseSupabaseUser(session.user, profileData, orgData);
          setUser(prev => {
            if (prev && JSON.stringify(prev) === JSON.stringify(newUser)) return prev;
            return newUser;
          });
        }
      } catch (error) {
        console.error('Failed to restore session', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { profileData, orgData } = await fetchUserProfile(session.user.id);
        
        // Fetch permissions on auth state change
        const { data: permsData } = await supabase.rpc('get_user_permissions', { p_user_id: session.user.id });
        if (permsData && mounted) {
          setPermissions(permsData);
        }

        if (mounted) {
          const newUser = parseSupabaseUser(session.user, profileData, orgData);
          setUser(prev => {
            if (prev && JSON.stringify(prev) === JSON.stringify(newUser)) return prev;
            return newUser;
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setPermissions([]);
      }
      setIsLoading(false);
    });

    let userChannel: any = null;

    // We can't know the user id synchronously, so we wait for initAuth to finish
    // then set up a realtime subscription if we have a user
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (userChannel) supabase.removeChannel(userChannel);
        userChannel = supabase.channel(`public_users_${session.user.id}_${Date.now()}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'users',
            filter: `id=eq.${session.user.id}`
          }, async (payload) => {
            // Verify if the session is still valid by reaching out to the server or if they were deactivated
            const { error: userError } = await supabase.auth.getUser();
            if (userError || (payload.new && payload.new.is_active === false)) {
              console.log('Session invalidated or user deactivated, logging out...');
              await supabase.auth.signOut();
              setUser(null);
              window.location.href = '/login';
            } else {
              // Update local profile since it changed
              const { profileData, orgData } = await fetchUserProfile(session.user.id);
              setUser(parseSupabaseUser(session.user, profileData, orgData));
            }
          })
          .subscribe();
      }
    };

    initAuth().then(setupRealtime);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (userChannel) supabase.removeChannel(userChannel);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Update last_login (non-blocking - don't fail login if this fails)
        try {
          await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
        } catch (updateErr) {
          console.warn('Could not update last_login:', updateErr);
        }
        
        const { data: profile } = await supabase.from('users').select('*, roles(name, is_system_admin, is_domain_admin), domains(id, name, slug)').eq('id', data.user.id).single();
        const { data: orgData } = await supabase.from('organization_users').select('*, organizations(*)').eq('user_id', data.user.id).eq('status', 'Active');

        // Fetch permissions during login (non-blocking - don't fail login if this fails)
        try {
          const { data: permsData } = await supabase.rpc('get_user_permissions', { p_user_id: data.user.id });
          if (permsData) {
            setPermissions(permsData);
          }
        } catch (permsErr) {
          console.warn('Could not fetch permissions:', permsErr);
        }

        setUser(parseSupabaseUser(data.user, profile, orgData || []));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      localStorage.removeItem('activeOrganizationId');
      setUser(null);
      setPermissions([]);
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out securely');
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (roles: Role[]) => {
    if (!user) return false;
    // Removed implicit Super Admin bypass here, components must use isSuperAdmin explicitly if they want it
    return roles.includes(user.role);
  };

  const isSuperAdmin = () => {
    return !!user?.isSystemAdmin;
  };

  const isDomainAdmin = (domainName?: string) => {
    if (!user) return false;
    
    // Explicit security metadata check, no string parsing
    if (!user.isDomainAdmin) return false;

    if (domainName) {
      return user.domain?.name === domainName || user.domain?.slug === domainName;
    }
    return true; // Is an admin for some domain
  };

  const isActive = () => {
    return !!user?.isActive;
  };

  const hasPermission = (action: string, resource: string) => {
    if (!user) return false;
    if (user.isSystemAdmin) return true; // Super Admin bypasses all checks
    
    return permissions.some(
      (p) => p.action?.toLowerCase() === action.toLowerCase() && 
             p.resource?.toLowerCase() === resource.toLowerCase()
    );
  };

  const hasResourceAccess = (resource: string) => {
    if (!user) return false;
    if (user.isSystemAdmin) return true; // Super Admin bypasses all checks
    
    return permissions.some(
      (p) => p.resource?.toLowerCase() === resource.toLowerCase()
    );
  };

  const canAccessDomain = (domainName: string) => {
    if (!user) return false;
    // Use explicit boolean flag, not role name string
    if (user.isSystemAdmin) return true;
    return user.domain?.name === domainName || user.domain?.slug === domainName;
  };

  const switchOrganization = (orgId: string) => {
    if (!user) return;
    if (user.organizations?.some(org => org.id === orgId)) {
      localStorage.setItem('activeOrganizationId', orgId);
      setUser({ ...user, activeOrganizationId: orgId });
      // Force page reload to clear state cleanly across app
      window.location.reload();
    }
  };

  const canAccessScope = (requiredScope: DataScope) => {
    if (!user) return false;
    if (user.isSystemAdmin || user.role === 'Super Admin') return true;
    const currentLevel = SCOPE_HIERARCHY[user.dataScope || 'ASSIGNED'] ?? 10;
    const targetLevel = SCOPE_HIERARCHY[requiredScope] ?? 10;
    return currentLevel >= targetLevel;
  };

  const currentScope: DataScope = user?.dataScope || 'ASSIGNED';

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      permissions, 
      dataScope: currentScope,
      login, 
      logout, 
      hasRole, 
      hasPermission, 
      hasResourceAccess, 
      canAccessScope,
      canAccessDomain, 
      switchOrganization, 
      isSuperAdmin, 
      isDomainAdmin, 
      isActive 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
