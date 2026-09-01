import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FilterState } from '../types/filter';
import { toast } from 'sonner';

export type ViewVisibility = 'private' | 'team' | 'organization';

export interface SavedView {
  id: string;
  name: string;
  user_id: string;
  filters: FilterState;
  columns?: any;
  is_default?: boolean;
  visibility: ViewVisibility;
  created_at: string;
  updated_at: string;
  organization_id?: string;
}

export function useSavedViews() {
  const { user } = useAuth();
  const [views, setViews] = useState<SavedView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchViews = async () => {
    if (!user) return;
    setIsLoading(true);
    
    const crmContext = user?.organizations?.find(o => o.id === user.activeOrganizationId)?.crm_context;
    
    // The RLS policy should automatically restrict views to the ones the user can see
    let query = supabase
      .from('saved_views')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (crmContext) {
      query = query.eq('filters->>crmContext', crmContext);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching saved views:', error);
      toast.error('Failed to fetch saved views');
    } else {
      // Make sure we parse the JSONB properly if needed, 
      // Supabase js client automatically parses JSONB to JS objects
      setViews(data as SavedView[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchViews();
  }, [user]);

  const saveView = async (
    name: string,
    filters: FilterState,
    visibility: ViewVisibility = 'private'
  ) => {
    if (!user) return { success: false };

    const { data, error } = await supabase
      .from('saved_views')
      .insert({
        name,
        user_id: user.id,
        filters,
        visibility,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving view:', error);
      toast.error('Failed to save view');
      return { success: false, error };
    }

    setViews(prev => [data as SavedView, ...prev]);
    toast.success('View saved successfully');
    return { success: true, data };
  };

  const updateView = async (
    id: string,
    updates: Partial<Pick<SavedView, 'name' | 'filters' | 'visibility'>>
  ) => {
    const { error } = await supabase
      .from('saved_views')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating view:', error);
      toast.error('Failed to update view');
      return { success: false, error };
    }

    setViews(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    toast.success('View updated successfully');
    return { success: true };
  };

  const deleteView = async (id: string) => {
    const { error } = await supabase
      .from('saved_views')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting view:', error);
      toast.error('Failed to delete view');
      return { success: false, error };
    }

    setViews(prev => prev.filter(v => v.id !== id));
    toast.success('View deleted successfully');
    return { success: true };
  };

  return {
    views,
    isLoading,
    fetchViews,
    saveView,
    updateView,
    deleteView,
  };
}
