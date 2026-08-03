import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';

export function useLead(id: string | undefined) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchLead() {
      if (!user || !id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('leads')
          .select(`
            *,
            counselor:users!leads_counselor_id_fkey(name),
            university:universities(name),
            course:courses(name)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          const mappedLead: Lead = {
            id: data.id,
            leadNumber: data.lead_number,
            firstName: data.first_name,
            lastName: data.last_name,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            email: data.email,
            phone: data.phone,
            alternatePhone: data.alternate_phone,
            state: data.state,
            city: data.city,
            country: data.country,
            budget: data.budget,
            leadSource: data.lead_source,
            source: data.lead_source, // legacy map
            leadStatus: data.lead_status,
            status: data.lead_status, // legacy map
            priority: data.priority,
            leadScore: data.lead_score,
            score: data.lead_score, // legacy map
            
            preferredLanguage: data.preferred_language,
            counselingMode: data.counseling_mode,
            notesCount: data.notes_count,
            tasksCount: data.tasks_count,
            admissionStatus: data.admission_status,
            
            assignedCounselor: data.assigned_counselor,
            counselorId: data.assigned_counselor, // legacy map
            universityId: data.university_id,
            courseId: data.course_id,
            
            counselor: data.counselor?.name || 'Unassigned',
            university: data.university?.name || 'Not Selected',
            course: data.course?.name || 'Not Selected',
            
            aiScore: data.ai_score,
            aiInsights: data.ai_insights,
            aiSuggestedNextAction: data.ai_suggested_next_action,
            aiSummary: data.ai_summary,
            
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
          setLead(mappedLead);
        }
      } catch (err: any) {
        console.error('Error fetching lead:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLead();
  }, [user, id]);

  const updateLead = async (updates: Partial<Lead>) => {
    if (!id) return { success: false, error: 'No ID' };
    
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
      
      setLead(prev => prev ? { ...prev, ...updates } : null);
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  return { lead, isLoading, error, updateLead };
}
