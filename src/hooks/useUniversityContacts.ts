import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export interface UniversityContact {
  id: string;
  universityId: string;
  organizationId: string | null;
  name: string;
  department: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  programId: string | null;
  region: string | null;
  isActive: boolean;
  internalNotes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  universityName?: string;
  programName?: string;
}

export function useUniversityContacts(universityId?: string) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<UniversityContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      let query = supabase
        .from('university_contacts')
        .select(`
          *,
          university:universities!university_id(name),
          program:courses!program_id(name)
        `)
        .order('name');
      
      if (universityId) {
        query = query.eq('university_id', universityId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      setContacts((data || []).map((c: any) => ({
        id: c.id,
        universityId: c.university_id,
        organizationId: c.organization_id,
        name: c.name,
        department: c.department,
        role: c.role,
        email: c.email,
        phone: c.phone,
        programId: c.program_id,
        region: c.region,
        isActive: c.is_active,
        internalNotes: c.internal_notes,
        createdBy: c.created_by,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        universityName: c.university?.name,
        programName: c.program?.name,
      })));
    } catch (err: any) {
      console.error('[useUniversityContacts]', err);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [user, universityId]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = async (contact: Partial<UniversityContact>) => {
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('university_contacts')
      .insert({
        university_id: contact.universityId,
        organization_id: contact.organizationId ?? null,
        name: contact.name,
        department: contact.department ?? null,
        role: contact.role ?? null,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        program_id: contact.programId ?? null,
        region: contact.region ?? null,
        is_active: contact.isActive ?? true,
        internal_notes: contact.internalNotes ?? null,
        created_by: user.id
      })
      .select()
      .single();
      
    if (error) throw error;
    fetchContacts();
    return data;
  };

  const updateContact = async (id: string, updates: Partial<UniversityContact>) => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.programId !== undefined) updateData.program_id = updates.programId;
    if (updates.region !== undefined) updateData.region = updates.region;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.internalNotes !== undefined) updateData.internal_notes = updates.internalNotes;
    
    const { error } = await supabase
      .from('university_contacts')
      .update(updateData)
      .eq('id', id);
      
    if (error) throw error;
    fetchContacts();
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase
      .from('university_contacts')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    fetchContacts();
  };

  return { contacts, isLoading, addContact, updateContact, deleteContact, refetch: fetchContacts };
}
