import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LeadFormField } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function useLeadFields() {
  const { user } = useAuth();
  const [fields, setFields] = useState<LeadFormField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lead_form_fields')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      setFields(data.map((f: any) => ({
        id: f.id,
        organizationId: f.organization_id,
        fieldName: f.field_name,
        fieldLabel: f.field_label,
        fieldType: f.field_type,
        isRequired: f.is_required,
        options: f.options,
        isActive: f.is_active,
        displayOrder: f.display_order,
        createdAt: f.created_at,
        updatedAt: f.updated_at
      })));
    } catch (err: any) {
      console.error('Error fetching lead fields:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const addField = async (field: Partial<LeadFormField>) => {
    try {
      const payload = {
        field_name: field.fieldName,
        field_label: field.fieldLabel,
        field_type: field.fieldType,
        is_required: field.isRequired,
        options: field.options,
        is_active: field.isActive,
        display_order: field.displayOrder
      };

      const { data, error } = await supabase
        .from('lead_form_fields')
        .insert([payload])
        .select()
        .single();
        
      if (error) throw error;
      await fetchFields();
      return { success: true, data };
    } catch (err: any) {
      console.error('Add field error:', err);
      return { success: false, error: err.message };
    }
  };

  const updateField = async (id: string, updates: Partial<LeadFormField>) => {
    try {
      const payload: any = {};
      if (updates.fieldName !== undefined) payload.field_name = updates.fieldName;
      if (updates.fieldLabel !== undefined) payload.field_label = updates.fieldLabel;
      if (updates.fieldType !== undefined) payload.field_type = updates.fieldType;
      if (updates.isRequired !== undefined) payload.is_required = updates.isRequired;
      if (updates.options !== undefined) payload.options = updates.options;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;

      const { error } = await supabase.from('lead_form_fields').update(payload).eq('id', id);
      if (error) throw error;
      
      await fetchFields();
      return { success: true };
    } catch (err: any) {
      console.error('Update field error:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteField = async (id: string) => {
    try {
      const { error } = await supabase.from('lead_form_fields').delete().eq('id', id);
      if (error) throw error;
      await fetchFields();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    fields,
    isLoading,
    error,
    addField,
    updateField,
    deleteField,
    refresh: fetchFields
  };
}
