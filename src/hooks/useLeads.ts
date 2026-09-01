import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';
import { applyFilters } from '../lib/filterQueryBuilder';
import type { FilterState } from '../types/filter';
import { emailCoreService } from '../lib/email/emailCoreService';

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
    dispositionCategory?: string;
    showDeleted?: boolean;
    dateRange?: { start: Date; end: Date } | null;
    minScore?: number;
  };
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
  advancedFilters?: FilterState;
}

export function useLeads(options?: UseLeadsOptions) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalUnfilteredCount, setTotalUnfilteredCount] = useState(0);
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

        let matchingDispositionIds: string[] | null = null;
        if (options?.filters?.dispositionCategory && options.filters.dispositionCategory !== 'All') {
          const { data: catData } = await supabase
            .from('disposition_categories')
            .select('id')
            .eq('name', options.filters.dispositionCategory)
            .maybeSingle();
            
          if (catData) {
            const { data: dispData } = await supabase.from('dispositions').select('id').eq('category_id', catData.id).eq('is_active', true);
            if (dispData && dispData.length > 0) {
              matchingDispositionIds = dispData.map(d => d.id);
            } else {
              matchingDispositionIds = []; // No dispositions found for this category
            }
          } else {
            matchingDispositionIds = [];
          }
        }
        
        const buildQuery = (excludeStatusFilter = false, columns = `
              *,
              counselor:users!leads_counselor_id_fkey(name),
              university:universities(name),
              course:courses(name),
              disposition:dispositions!leads_latest_disposition_id_fkey(name, target_status)
            `) => {
          let query = supabase
            .from('leads')
            .select(columns, { count: 'exact' });
    
          if (options?.filters?.showDeleted) {
            query = query.not('deleted_at', 'is', null);
          } else {
            query = query.is('deleted_at', null);
          }
    
          // Apply Search
          if (options?.search) {
            query = query.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%,lead_number.ilike.%${options.search}%`);
          }
          
          // Apply Disposition Category Filter
          if (matchingDispositionIds !== null) {
            if (matchingDispositionIds.length > 0) {
               query = query.in('latest_disposition_id', matchingDispositionIds);
            } else {
               // Force empty result since category has no dispositions or category not found
               query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
          }
  
        // Apply Filters
        if (!excludeStatusFilter && options?.filters?.status && options.filters.status !== 'All') {
          query = query.eq('lead_status', options.filters.status);
        }
        if (options?.filters?.priority && options.filters.priority !== 'All') {
          query = query.eq('priority', options.filters.priority);
        }
        if (options?.filters?.source && options.filters.source !== 'All') {
          query = query.eq('lead_source', options.filters.source);
        }
        // Apply Role-Based Data Isolation
        if (user.role !== 'Super Admin' && user.role !== 'Admin') {
          query = query.eq('assigned_counselor', user.id);
        } else if (options?.filters?.counselorId && options.filters.counselorId !== 'All') {
          // Only Admins can filter by other counselors
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
        if (options?.filters?.minScore !== undefined) {
          query = query.gte('lead_score', options?.filters.minScore);
        }
  
        // Apply Advanced Filters (canonical filter engine)
        if (options?.advancedFilters && !excludeStatusFilter) {
          query = applyFilters(query, options.advancedFilters);
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
          if (dbField === 'updatedAt') dbField = 'updated_at';
          if (dbField === 'callAttempts') dbField = 'call_attempts';
          if (dbField === 'interactionsCount') dbField = 'interactions_count';
          if (dbField === 'lastCallDate') dbField = 'last_call_date';
          if (dbField === 'finalFollowUpDate') dbField = 'final_follow_up_date';
           if (dbField === 'transitionToFallOut') dbField = 'transition_to_fallout_at';
           if (dbField === 'transitionToCounselled') dbField = 'transition_to_counselled_at';
           if (dbField === 'transitionToOBInitiated') dbField = 'transition_to_ob_initiated_at';
           if (dbField === 'transitionToOffer') dbField = 'transition_to_offer_at';
           if (dbField === 'transitionToConverted') dbField = 'transition_to_converted_at';
           if (dbField === 'transitionToScreening') dbField = 'transition_to_screening_at';
           // Derived/removed fields - sort in frontend after mapping
           if (['assignmentDate', 'firstAssignmentDate', 'firstCallDate', 'contactedTimestamp', 'conversionDate', 'managerPrioritized', 'moreThan5MContactedTime', 'moreThan10MContactedTime', 'moreThan15MContactedTime', 'transitionToAdmitted', 'transitionToVerificationPending'].includes(dbField)) {
            dbField = 'created_at';
          }
          
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
      let statusCounts: Record<string, number> = {};
      let totalUnfilteredCount = 0;

      // Declare maps for derived data
      let assignmentsMap = new Map<string, any[]>();
      let callsMap = new Map<string, any[]>();
      let dispositionHistoryMap = new Map<string, any[]>();
      let documentsMap = new Map<string, any[]>();

      const { data, count, error } = await buildQuery().range(start, end);
      
      if (error) throw error;
      if (data) allData = data;
      if (count !== null) finalCount = count;

      // Fetch status counts ignoring the status filter
      const { data: statusData, error: statusError } = await buildQuery(true, 'lead_status');
      
      if (!statusError && statusData) {
        totalUnfilteredCount = statusData.length;
        statusData.forEach(row => {
          const status = (row as any).lead_status || 'New';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
      }

      // Fetch derived data for assignment dates, call dates, and contact timestamps
      // Only fetch for the current page of leads (not all leads at once)
      if (allData.length > 0) {
        const leadIds = allData.map(d => d.id);

        // Fetch lead assignments for assignment dates
        const { data: assignmentData } = await supabase
          .from('lead_assignments')
          .select('lead_id, assignee_id, assigned_at, assigned_by, is_active')
          .in('lead_id', leadIds)
          .order('assigned_at', { ascending: true });

        if (assignmentData) {
          assignmentData.forEach((a: any) => {
            const arr = assignmentsMap.get(a.lead_id) || [];
            arr.push(a);
            assignmentsMap.set(a.lead_id, arr);
          });
        }

        // Fetch call data for first call dates and duration thresholds
        const { data: callData } = await supabase
          .from('calls')
          .select('lead_id, duration_seconds, created_at, status')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: true });

        if (callData) {
          callData.forEach((c: any) => {
            const arr = callsMap.get(c.lead_id) || [];
            arr.push(c);
            callsMap.set(c.lead_id, arr);
          });
        }

        // Fetch disposition history for contacted timestamps and transition events
        const { data: dispositionHistoryData } = await supabase
          .from('lead_disposition_history')
          .select('lead_id, new_status, previous_status, created_at')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: true });

        if (dispositionHistoryData) {
          dispositionHistoryData.forEach((d: any) => {
            const arr = dispositionHistoryMap.get(d.lead_id) || [];
            arr.push(d);
            dispositionHistoryMap.set(d.lead_id, arr);
          });
        }

        // Fetch document verification data
        const { data: documentsData } = await supabase
          .from('documents')
          .select('lead_id, verification_status, verification_date, created_at')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: true });

        if (documentsData) {
          documentsData.forEach((doc: any) => {
            const arr = documentsMap.get(doc.lead_id) || [];
            arr.push(doc);
            documentsMap.set(doc.lead_id, arr);
          });
        }
      }

      // Map the database snake_case fields to our frontend camelCase types
      const mappedLeads: Lead[] = allData.map((d: any) => {
        const assignments = assignmentsMap.get(d.id) || [];
        const calls = callsMap.get(d.id) || [];
        const dispositionHistory = dispositionHistoryMap.get(d.id) || [];

        // Derive Assignment Date (latest active assignment)
        const latestAssignment = assignments.filter((a: any) => a.is_active).sort((x: any, y: any) => new Date(y.assigned_at).getTime() - new Date(x.assigned_at).getTime())[0];
        const assignmentDate = latestAssignment?.assigned_at || null;

        // Derive First Assignment Date (earliest assignment ever)
        const firstAssignment = assignments.sort((x: any, y: any) => new Date(x.assigned_at).getTime() - new Date(y.assigned_at).getTime())[0];
        const firstAssignmentDate = firstAssignment?.assigned_at || null;

        // Derive First Call Date (earliest call per lead)
        const firstCall = calls.sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())[0];
        const firstCallDate = firstCall?.created_at || null;

        // Derive Contacted Timestamp (first disposition history entry where contact was made)
        // Use the first disposition in history that indicates contact was attempted
        const contactedHistory = dispositionHistory.find((h: any) => h.new_status !== 'New' && h.new_status !== 'Inquiry');
        const contactedTimestamp = contactedHistory?.created_at || null;

        // Derive time-based contact flags from cumulative call durations
        // Sum all successful call durations per lead
        const totalCallDuration = calls.reduce((sum: number, c: any) => {
          if (c.status !== 'failed' && c.status !== 'missed') {
            return sum + (c.duration_seconds || 0);
          }
          return sum;
        }, 0);
        const moreThan5M = totalCallDuration >= 300;
        const moreThan10M = totalCallDuration >= 600;
        const moreThan15M = totalCallDuration >= 900;

        // Derive Conversion Date from transition_to_converted_at
        const conversionDate = d.transition_to_converted_at || null;

        // Derive Manager Prioritized from priority = 'High'
        const managerPrioritized = d.priority === 'High';

        // Derive Transition to Admitted from disposition history
        // Look for when status transitioned to 'Admitted'
        const admittedTransition = dispositionHistory.find((h: any) => h.new_status === 'Admitted');
        const transitionToAdmitted = admittedTransition?.created_at || d.transition_to_admitted_at || null;

        // Derive Transition to Verification Pending from disposition history
        // Look for status transitions containing 'Verification' or 'Docs'
        const verificationTransition = dispositionHistory.find((h: any) => 
          h.new_status?.toLowerCase().includes('verification') || 
          h.new_status?.toLowerCase().includes('docs')
        );
        
        // Also check documents table for verification pending status
        const documents = documentsMap.get(d.id) || [];
        const docVerificationPending = documents.find((doc: any) => 
          doc.verification_status?.toLowerCase().includes('pending') || 
          doc.verification_status?.toLowerCase().includes('under review')
        );
        
        const transitionToVerificationPending = 
          verificationTransition?.created_at || 
          docVerificationPending?.verification_date ||
          d.transition_to_verification_pending_at || 
          null;

        return {
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
          customFields: d.custom_fields || {},
          
           // Command Center Fields
          temperature: d.temperature,
          tags: d.tags || [],
          
          // Transition Timestamps (from backend triggers)
          transitionToFallOut: d.transition_to_fallout_at,
          transitionToCounselled: d.transition_to_counselled_at,
          transitionToOBInitiated: d.transition_to_ob_initiated_at,
          transitionToAdmitted: transitionToAdmitted,
          transitionToOffer: d.transition_to_offer_at,
          transitionToVerificationPending: transitionToVerificationPending,
          transitionToConverted: d.transition_to_converted_at,
          transitionToScreening: d.transition_to_screening_at,

          // Activity Summary Fields (computed via triggers/migration 126)
          callAttempts: d.call_attempts || 0,
          interactionsCount: d.interactions_count || 0,
          lastCallDate: d.last_call_date,
          finalFollowUpDate: d.final_follow_up_date,
          updatedAt: d.updated_at,

          // Assignment & Call Tracking (derived from related tables)
          assignmentDate: assignmentDate,
          firstAssignmentDate: firstAssignmentDate,
          firstCallDate: firstCallDate,
          contactedTimestamp: contactedTimestamp,
          moreThan5MContactedTime: moreThan5M,
          moreThan10MContactedTime: moreThan10M,
          moreThan15MContactedTime: moreThan15M,

          // Conversion & Manager Priority
          conversionDate: conversionDate,
          managerPrioritized: managerPrioritized,

          // Snake case versions for direct DB access
          transition_to_admitted_at: transitionToAdmitted,
          transition_to_verification_pending_at: transitionToVerificationPending,
          
          latestDispositionId: d.latest_disposition_id,
          latestSubDispositionId: d.latest_sub_disposition_id,
          latestDispositionName: d.disposition?.name,        // For Connected/Not Connected views
          latestDispositionTargetStatus: d.disposition?.target_status, // Maps to lead_status
          nextActionDate: d.next_action_date,
          
          createdAt: d.created_at,
          deletedAt: d.deleted_at,
          counselorName: d.counselor?.name,
          universityName: d.university?.name,
          courseName: d.course?.name
        };
      });

      setLeads(mappedLeads);
      setTotalCount(finalCount);
      setStatusCounts(statusCounts);
      setTotalUnfilteredCount(totalUnfilteredCount);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, (payload) => {
        console.log('Calls table change received:', payload);
        fetchLeads();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_activities' }, (payload) => {
        console.log('Lead activities change received:', payload);
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
        partner_id: user.role === 'Partner' ? user.id : undefined,
        organization_id: user.activeOrganizationId,

        age: leadData.age,
        gender: leadData.gender,
        education: leadData.education,
        graduation_percentage: leadData.graduationPercentage,
        twelfth_percentage: leadData.twelfthPercentage,
        tenth_percentage: leadData.tenthPercentage,
        current_occupation: leadData.currentOccupation,
        years_of_experience: leadData.yearsOfExperience,
        industry: leadData.industry,
        annual_income: leadData.annualIncome,
        preferred_specialization: leadData.preferredSpecialization,
        preferred_learning_mode: leadData.preferredLearningMode,
        career_goal: leadData.careerGoal,
        need_placement_support: leadData.needPlacementSupport,
        need_scholarship: leadData.needScholarship,
        need_emi: leadData.needEmi,
        preferred_intake: leadData.preferredIntake,
        tenth_board: leadData.tenthBoard,
        tenth_passing_year: leadData.tenthPassingYear,
        twelfth_board: leadData.twelfthBoard,
        twelfth_stream: leadData.twelfthStream,
        twelfth_passing_year: leadData.twelfthPassingYear,
        graduation_degree: leadData.graduationDegree,
        graduation_university: leadData.graduationUniversity,
        graduation_passing_year: leadData.graduationPassingYear,
        graduation_backlogs: leadData.graduationBacklogs,
        graduation_mode: leadData.graduationMode,
        post_graduation_degree: leadData.postGraduationDegree,
        post_graduation_university: leadData.postGraduationUniversity,
        post_graduation_percentage: leadData.postGraduationPercentage,
        post_graduation_passing_year: leadData.postGraduationPassingYear,
        gap_years: leadData.gapYears,
        gap_explanation: leadData.gapExplanation,
        company: leadData.company,
        job_title: leadData.jobTitle,
        employment_status: leadData.employmentStatus,
        target_role: leadData.targetRole,
        motivation: leadData.motivation,
        urgency: leadData.urgency,
        university_brand_preference: leadData.universityBrandPreference,
        lost_reason: leadData.lostReason,
        competitor: leadData.competitor,
        custom_fields: leadData.customFields || {}
      };

      const { data, error } = await supabase
        .from('leads')
        .insert([newLeadData])
        .select()
        .single();
        
      if (error) throw error;

      // ---- EMAIL NOTIFICATION FOR ADMINS ----
      try {
        
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
      if (updates.customFields !== undefined) payload.custom_fields = updates.customFields;

      if (updates.age !== undefined) payload.age = updates.age;
      if (updates.gender !== undefined) payload.gender = updates.gender;
      if (updates.education !== undefined) payload.education = updates.education;
      if (updates.graduationPercentage !== undefined) payload.graduation_percentage = updates.graduationPercentage;
      if (updates.twelfthPercentage !== undefined) payload.twelfth_percentage = updates.twelfthPercentage;
      if (updates.tenthPercentage !== undefined) payload.tenth_percentage = updates.tenthPercentage;
      if (updates.currentOccupation !== undefined) payload.current_occupation = updates.currentOccupation;
      if (updates.yearsOfExperience !== undefined) payload.years_of_experience = updates.yearsOfExperience;
      if (updates.industry !== undefined) payload.industry = updates.industry;
      if (updates.annualIncome !== undefined) payload.annual_income = updates.annualIncome;
      if (updates.preferredSpecialization !== undefined) payload.preferred_specialization = updates.preferredSpecialization;
      if (updates.preferredLearningMode !== undefined) payload.preferred_learning_mode = updates.preferredLearningMode;
      if (updates.careerGoal !== undefined) payload.career_goal = updates.careerGoal;
      if (updates.needPlacementSupport !== undefined) payload.need_placement_support = updates.needPlacementSupport;
      if (updates.needScholarship !== undefined) payload.need_scholarship = updates.needScholarship;
      if (updates.needEmi !== undefined) payload.need_emi = updates.needEmi;
      if (updates.preferredIntake !== undefined) payload.preferred_intake = updates.preferredIntake;
      if (updates.tenthBoard !== undefined) payload.tenth_board = updates.tenthBoard;
      if (updates.tenthPassingYear !== undefined) payload.tenth_passing_year = updates.tenthPassingYear;
      if (updates.twelfthBoard !== undefined) payload.twelfth_board = updates.twelfthBoard;
      if (updates.twelfthStream !== undefined) payload.twelfth_stream = updates.twelfthStream;
      if (updates.twelfthPassingYear !== undefined) payload.twelfth_passing_year = updates.twelfthPassingYear;
      if (updates.graduationDegree !== undefined) payload.graduation_degree = updates.graduationDegree;
      if (updates.graduationUniversity !== undefined) payload.graduation_university = updates.graduationUniversity;
      if (updates.graduationPassingYear !== undefined) payload.graduation_passing_year = updates.graduationPassingYear;
      if (updates.graduationBacklogs !== undefined) payload.graduation_backlogs = updates.graduationBacklogs;
      if (updates.graduationMode !== undefined) payload.graduation_mode = updates.graduationMode;
      if (updates.postGraduationDegree !== undefined) payload.post_graduation_degree = updates.postGraduationDegree;
      if (updates.postGraduationUniversity !== undefined) payload.post_graduation_university = updates.postGraduationUniversity;
      if (updates.postGraduationPercentage !== undefined) payload.post_graduation_percentage = updates.postGraduationPercentage;
      if (updates.postGraduationPassingYear !== undefined) payload.post_graduation_passing_year = updates.postGraduationPassingYear;
      if (updates.gapYears !== undefined) payload.gap_years = updates.gapYears;
      if (updates.gapExplanation !== undefined) payload.gap_explanation = updates.gapExplanation;
      if (updates.company !== undefined) payload.company = updates.company;
      if (updates.jobTitle !== undefined) payload.job_title = updates.jobTitle;
      if (updates.employmentStatus !== undefined) payload.employment_status = updates.employmentStatus;
      if (updates.targetRole !== undefined) payload.target_role = updates.targetRole;
      if (updates.motivation !== undefined) payload.motivation = updates.motivation;
      if (updates.urgency !== undefined) payload.urgency = updates.urgency;
      if (updates.universityBrandPreference !== undefined) payload.university_brand_preference = updates.universityBrandPreference;
      if (updates.lostReason !== undefined) payload.lost_reason = updates.lostReason;
      if (updates.competitor !== undefined) payload.competitor = updates.competitor;
      
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
      const { error: rpcError } = await supabase.rpc('bulk_delete_leads', { p_lead_ids: ids });
      
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
        organization_id: user?.activeOrganizationId,
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
        author: user?.name || 'System'
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
      const { error: rpcError } = await supabase.rpc('bulk_update_leads', {
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

  return { leads, totalCount, isLoading, error, addLead, updateLead, deleteLead, bulkDeleteLeads, restoreLead, duplicateLead, mergeLeads, bulkUpdateLeads, refresh: fetchLeads, statusCounts, totalUnfilteredCount };
}
