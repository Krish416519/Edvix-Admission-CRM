import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UniversityProfile {
  id: string;
  university_id: string;
  university_role: string;
  department: string | null;
  is_active: boolean;
  university: {
    name: string;
    code: string;
  };
}

export function useUniversityProfile() {
  const [profile, setProfile] = useState<UniversityProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const { data, error } = await supabase
          .from('university_profiles')
          .select(`
            *,
            university:universities(name, code)
          `)
          .eq('id', user!.id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Error fetching university profile:', error);
          }
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Unexpected error fetching university profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  return { profile, isLoading };
}
