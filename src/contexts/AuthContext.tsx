import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role } from '../types/auth';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback avatar for users without one
const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?u=a042581f4e29026704d';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to construct our local User object from a Supabase User
  const parseSupabaseUser = (sbUser: any, profileData?: any): User => {
    const email = sbUser.email || '';
    
    // Role is pulled directly from user metadata (JWT claim) or falls back to 'Viewer'
    const role: Role = (sbUser.user_metadata?.role as Role) || 'Viewer';
    
    const name = profileData?.name || sbUser.user_metadata?.name || email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const avatar = profileData?.avatar_url || sbUser.user_metadata?.avatar_url || DEFAULT_AVATAR;

    return {
      id: sbUser.id,
      email,
      name,
      role,
      avatar,
      phone: profileData?.phone,
      department: profileData?.department,
      lastLogin: profileData?.last_login,
      isActive: profileData?.is_active ?? true
    };
  };

  useEffect(() => {
    let mounted = true;

    // Fetch user profile from DB
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
        }
        return data || null;
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        return null;
      }
    };

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user && mounted) {
          const profile = await fetchUserProfile(session.user.id);
          setUser(parseSupabaseUser(session.user, profile));
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
        const profile = await fetchUserProfile(session.user.id);
        if (mounted) setUser(parseSupabaseUser(session.user, profile));
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
        // Update last_login
        await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
        
        const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
        setUser(parseSupabaseUser(data.user, profile));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out securely');
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (roles: Role[]) => {
    if (!user) return false;
    if (user.role === 'Super Admin') return true; // Super Admin has all access
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole }}>
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
