import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export interface PartnerProfile {
  id: string;
  company_name: string | null;
  partner_type: string;
  tax_id: string | null;
  commission_tier: string;
  status: string;
}

export function usePartnerProfile() {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchProfile() {
      if (!user || user.role !== 'Partner') {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('partner_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching partner profile:', error);
          toast.error('Failed to load partner profile');
        } else if (data) {
          setProfile(data);
        } else {
          // Profile doesn't exist yet, we could auto-create it or just let the app handle it
          setProfile({
            id: user.id,
            company_name: null,
            partner_type: 'Freelancer',
            tax_id: null,
            commission_tier: 'Standard',
            status: 'Active'
          });
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  return { profile, isLoading };
}
