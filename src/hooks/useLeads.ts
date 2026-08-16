import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus, LeadPriority } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';

export interface UseLeadsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: {
    status?: string;
    priority?: string;
    source?: string;
    counselorId?: string;
    universityId?: string;
    courseId?: string;
    state?: string;
    city?: string;
    showDeleted?: boolean;
    dateRange?: { start: Date; end: Date } | null;
  };
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
}

export function useLeads(options?: UseLeadsOptions) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchLeads = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      
      const buildQuery = () => {
        let query = supabase
          .from('leads')
          .select(`
            *,
            counselor:users!leads_counselor_id_fkey(name),
            university:universities(name),
            course:courses(name)
          `, { count: 'exact' });
  
        if (options?.filters?.showDeleted) {
          query = query.not('deleted_at', 'is', null);
        } else {
          query = query.is('deleted_at', null);
        }
  
        // Apply Search
        if (options?.search) {
          query = query.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%,lead_number.ilike.%${options.search}%`);
        }
  
        // Apply Filters
        if (options?.filters?.status && options.filters.status !== 'All') {
          query = query.eq('lead_status', options.filters.status);
        }
        if (options?.filters?.priority && options.filters.priority !== 'All') {
          query = query.eq('priority', options.filters.priority);
        }
        if (options?.filters?.source && options.filters.source !== 'All') {
          query = query.eq('lead_source', options.filters.source);
        }
        if (options?.filters?.counselorId && options.filters.counselorId !== 'All') {
          query = query.eq('assigned_counselor', options.filters.counselorId);
        }
        if (options?.filters?.universityId && options.filters.universityId !== 'All') {
          query = query.eq('university_id', options.filters.universityId);
        }
        if (options?.filters?.courseId && options.filters.courseId !== 'All') {
          query = query.eq('course_id', options.filters.courseId);
        }
        if (options?.filters?.state && options.filters.state !== 'All') {
          query = query.eq('state', options.filters.state);
        }
        if (options?.filters?.city && options.filters.city !== 'All') {
          query = query.eq('city', options.filters.city);
        }
        if (options?.filters?.dateRange) {
          query = query.gte('created_at', options.filters.dateRange.start.toISOString());
          query = query.lte('created_at', options.filters.dateRange.end.toISOString());
        }
  
        // Apply Sorting
        if (options?.sort) {
          let dbField = options.sort.field;
          // Map frontend fields to DB fields
          if (dbField === 'name') dbField = 'first_name';
          if (dbField === 'counselor') dbField = 'users.name';
          if (dbField === 'status') dbField = 'lead_status';
          if (dbField === 'source') dbField = 'lead_source';
          if (dbField === 'score') dbField = 'lead_score';
          if (dbField === 'createdAt') dbField = 'created_at';
          
          query = query.order(dbField, { ascending: options.sort.direction === 'asc' });
        } else {
          query = query.order('created_at', { ascending: false });
        }
        return query;
      };

      // Apply Pagination
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 1000;
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      
      let allData: any[] = [];
      let finalCount = 0;
      const fetchChunkSize = 1000;
      const ranges = [];
      for (let i = start; i <= end; i += fetchChunkSize) {
        ranges.push({ s: i, e: Math.min(i + fetchChunkSize - 1, end) });
      }

      const results = await Promise.all(ranges.map(r => buildQuery().range(r.s, r.e)));

      for (const res of results) {
        if (res.error) throw res.error;
        if (res.data) allData.push(...res.data);
        if (res.count !== null && res.count !== undefined) {
          finalCount = Math.max(finalCount, res.count);
        }
      }

      // Map the database snake_case fields to our frontend camelCase types
      const mappedLeads: Lead[] = allData.map((d: any) => ({
        id: d.id,
        leadNumber: d.lead_number,
        firstName: d.first_name,
        lastName: d.last_name,
        name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
        email: d.email,
        phone: d.phone,
        alternatePhone: d.alternate_phone,
        state: d.state,
        city: d.city,
        country: d.country,
        budget: d.budget,
        leadSource: d.lead_source,
        source: d.lead_source, // legacy map
        leadStatus: d.lead_status,
        status: d.lead_status, // legacy map
        priority: d.priority,
        leadScore: d.lead_score,
        score: d.lead_score, // legacy map
        
        preferredLanguage: d.preferred_language,
        counselingMode: d.counseling_mode,
        notesCount: d.notes_count,
        tasksCount: d.tasks_count,
        admissionStatus: d.admission_status,
        
        assignedCounselor: d.assigned_counselor,
        counselorId: d.assigned_counselor, // legacy map
        universityId: d.university_id,
        courseId: d.course_id,
        
        createdAt: d.created_at,
        deletedAt: d.deleted_at,
        counselorName: d.counselor?.name,
        universityName: d.university?.name,
        courseName: d.course?.name
      }));

      setLeads(mappedLeads);
      setTotalCount(finalCount);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    // Subscribe to real-time changes on the leads table
    const channelId = `leads_changes_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        console.log('Real-time change received:', payload);
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, options?.page, options?.pageSize, options?.search, JSON.stringify(options?.filters), JSON.stringify(options?.sort)]);

  const addLead = async (leadData: Partial<Lead>) => {
    try {
      if (!user) throw new Error('Not authenticated');

      // If user is a Partner, automatically set their ID as the partner_id
      const newLeadData = {
        first_name: leadData.firstName || leadData.name?.split(' ')[0] || '',
        last_name: leadData.lastName || leadData.name?.split(' ').slice(1).join(' ') || '',
        email: leadData.email,
        phone: leadData.phone,
        alternate_phone: leadData.alternatePhone,
        state: leadData.state,
        city: leadData.city,
        country: leadData.country,
        budget: leadData.budget,
        lead_source: leadData.leadSource || leadData.source || 'Direct',
        lead_status: leadData.leadStatus || leadData.status || 'New',
        priority: leadData.priority || 'Medium',
        lead_score: leadData.leadScore || leadData.score || 0,
        preferred_language: leadData.preferredLanguage,
        counseling_mode: leadData.counselingMode,
        course_id: leadData.courseId || null,
        university_id: leadData.universityId || null,
        assigned_counselor: leadData.assignedCounselor || leadData.counselorId || user?.id,
        partner_id: user.role === 'Partner' ? user.id : undefined
      };

      const { data, error } = await supabase
        .from('leads')
        .insert([newLeadData])
        .select()
        .single();
        
      if (error) throw error;

      // ---- EMAIL NOTIFICATION FOR ADMINS ----
      try {
        const { emailCoreService } = await import('../lib/email/EmailService');
        
        // Fetch Admin users to notify
        const { data: admins } = await supabase
          .from('users')
          .select('id, email, name, role_id')
          .not('email', 'is', null);

        // We filter manually here just in case RLS or join syntax has issues
        // Assuming we want to notify all admins
        if (admins && admins.length > 0) {
          for (const admin of admins) {
            // Ideally we check role here, but we will send to all known admins. 
            // If the user's role_id matches an admin role, send it. 
            // Let's rely on a simpler approach: if they have an email, we send it.
            // Actually, we should fetch roles to be safe.
            const { data: roleData } = await supabase.from('roles').select('id, name').eq('id', admin.role_id).single();
            if (roleData && (roleData.name === 'Super Admin' || roleData.name === 'Admin')) {
              await emailCoreService.sendEmail({
                recipientEmail: admin.email,
                recipientName: admin.name,
                subject: 'New Lead Captured: ' + (data.first_name || 'Student'),
                body: `<p>Hi ${admin.name},</p><p>A new lead <strong>${data.first_name} ${data.last_name || ''}</strong> has just been captured in the system.</p><p>Source: ${data.lead_source}</p><p>Please log in to the CRM to view the details.</p>`,
                folder: 'Sent',
                trackingEnabled: false
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to send admin email notification:', e);
      }
      // ---------------------------------------

      await fetchLeads(); // Refetch to get populated relations
      return { success: true, data };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const payload: any = {};
      if (updates.firstName !== undefined) payload.first_name = updates.firstName;
      if (updates.lastName !== undefined) payload.last_name = updates.lastName;
      if (updates.name !== undefined) {
         payload.first_name = updates.name.split(' ')[0];
         payload.last_name = updates.name.split(' ').slice(1).join(' ');
      }
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.alternatePhone !== undefined) payload.alternate_phone = updates.alternatePhone;
      if (updates.leadStatus !== undefined) payload.lead_status = updates.leadStatus;
      if (updates.status !== undefined) payload.lead_status = updates.status;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.leadScore !== undefined) payload.lead_score = updates.leadScore;
      if (updates.score !== undefined) payload.lead_score = updates.score;
      if (updates.assignedCounselor !== undefined) payload.assigned_counselor = updates.assignedCounselor;
      if (updates.counselorId !== undefined) payload.assigned_counselor = updates.counselorId;
      if (updates.universityId !== undefined) payload.university_id = updates.universityId;
      if (updates.courseId !== undefined) payload.course_id = updates.courseId;
      
      const { error } = await supabase.from('leads').update(payload).eq('id', id);
      if (error) throw error;
      
      await fetchLeads(); // Refetch
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const deleteLead = async (id: string) => {
    try {
      // Soft Delete
      const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      
      await fetchLeads();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const bulkDeleteLeads = async (ids: string[]) => {
    try {
      // Try the fast RPC first
      const { data, error: rpcError } = await supabase.rpc('bulk_delete_leads', { p_lead_ids: ids });
      
      if (rpcError) {
        // Fallback: Chunk the IDs to avoid URL length limits
        const chunkSize = 200;
        const chunks = [];
        for (let i = 0; i < ids.length; i += chunkSize) {
          chunks.push(ids.slice(i, i + chunkSize));
        }

        await Promise.all(chunks.map(async (chunkIds) => {
          const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).in('id', chunkIds);
          if (error) throw error;
        }));
      }

      await fetchLeads();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const restoreLead = async (id: string) => {
    try {
      const { error } = await supabase.from('leads').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
      await fetchLeads();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const duplicateLead = async (id: string) => {
    try {
      const leadToDuplicate = leads.find(l => l.id === id);
      if (!leadToDuplicate) throw new Error('Lead not found in current list');
      
      const payload = {
        first_name: leadToDuplicate.firstName + ' (Copy)',
        last_name: leadToDuplicate.lastName,
        email: leadToDuplicate.email,
        phone: leadToDuplicate.phone, // Warning: this may violate UNIQUE constraint if enforced, user may need to change it
        alternate_phone: leadToDuplicate.alternatePhone,
        state: leadToDuplicate.state,
        city: leadToDuplicate.city,
        country: leadToDuplicate.country,
        budget: leadToDuplicate.budget,
        lead_source: leadToDuplicate.leadSource,
        lead_status: 'New', // Reset status for duplicates
        priority: leadToDuplicate.priority,
        preferred_language: leadToDuplicate.preferredLanguage,
        counseling_mode: leadToDuplicate.counselingMode,
        course_id: leadToDuplicate.courseId,
        university_id: leadToDuplicate.universityId,
        assigned_counselor: leadToDuplicate.assignedCounselor,
      };

      const { data, error } = await supabase.from('leads').insert([payload]).select().single();
      if (error) throw error;
      await fetchLeads();
      return { success: true, data };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const mergeLeads = async (primaryId: string, secondaryId: string, mergedData: Partial<Lead>) => {
    try {
      // 1. Update the primary lead with the new merged data
      await updateLead(primaryId, mergedData);
      
      // 2. Log the merge activity on the primary lead
      await supabase.from('lead_activities').insert([{
        lead_id: primaryId,
        type: 'merge',
        content: `Merged with duplicate lead (ID: ${secondaryId})`,
        author: user?.user_metadata?.name || 'System'
      }]);

      // 3. Soft-delete the secondary lead
      await deleteLead(secondaryId);
      
      await fetchLeads();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const bulkUpdateLeads = async (ids: string[], updates: Partial<Lead>) => {
    try {
      const payload: any = {};
      if (updates.leadStatus !== undefined) payload.lead_status = updates.leadStatus;
      if (updates.status !== undefined) payload.lead_status = updates.status;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.leadSource !== undefined) payload.lead_source = updates.leadSource;
      if (updates.source !== undefined) payload.lead_source = updates.source;

      if (Object.keys(payload).length === 0) {
        return { success: true }; // Nothing to update
      }

      // Try the fast RPC first
      const { data, error: rpcError } = await supabase.rpc('bulk_update_leads', {
        p_lead_ids: ids,
        p_status: payload.lead_status || null,
        p_priority: payload.priority || null,
        p_source: payload.lead_source || null
      });

      if (rpcError) {
        // Fallback: Chunk the IDs to avoid URL length limits
        const chunkSize = 200;
        const chunks = [];
        for (let i = 0; i < ids.length; i += chunkSize) {
          chunks.push(ids.slice(i, i + chunkSize));
        }

        await Promise.all(chunks.map(async (chunkIds) => {
          const { error } = await supabase.from('leads').update(payload).in('id', chunkIds);
          if (error) throw error;
        }));
      }
      
      await fetchLeads();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  return { leads, totalCount, isLoading, error, addLead, updateLead, deleteLead, bulkDeleteLeads, restoreLead, duplicateLead, mergeLeads, bulkUpdateLeads, refresh: fetchLeads };
}
