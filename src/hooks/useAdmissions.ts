import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Admission, AdmissionStage, AdmissionStatus,
  AdmissionStageHistory, AdmissionNote, AdmissionTag
} from '../types/schema';
import { useAuth } from '../contexts/AuthContext';

export interface UseAdmissionsOptions {
  leadId?: string;
  stage?: string;
  status?: string;
  universityId?: string;
  courseId?: string;
  counselorId?: string;
  intake?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  enableRealtime?: boolean;
  includeDeleted?: boolean;
}

// Helper to map raw Supabase row to Admission interface
function mapAdmission(d: any): Admission {
  const currentStage = (d.current_stage || 'Inquiry') as AdmissionStage;
  return {
    id: d.id,
    admissionNumber: d.admission_number,

    // Relationships
    leadId: d.lead_id,
    universityId: d.university_id,
    courseId: d.course_id,
    assignedCounselor: d.assigned_counselor,

    // Student info
    studentName: d.student_name,
    email: d.email,
    phone: d.phone,
    specialization: d.specialization,

    // Program
    intake: d.intake,
    academicSession: d.academic_session,

    // Status
    admissionStatus: (d.admission_status || 'Active') as AdmissionStatus,
    currentStage,
    stage: currentStage, // alias for UI backward compat
    progress: d.progress || 0,

    // Application
    applicationNumber: d.application_number,
    universityEnrollmentNumber: d.university_enrollment_number,
    enrollmentNumber: d.university_enrollment_number, // alias
    abcId: d.abc_id,
    debId: d.deb_id,

    // Finance
    feeStructure: d.fee_structure,
    scholarshipAmount: d.scholarship_amount,
    discount: d.discount,
    expectedRevenue: d.expected_revenue,

    // Dates
    registrationDate: d.registration_date,
    admissionDate: d.admission_date,
    enrollmentDate: d.enrollment_date,

    // General
    remarks: d.remarks,
    notes: d.remarks, // alias for UI

    // Audit
    createdBy: d.created_by,
    updatedBy: d.updated_by,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    deletedAt: d.deleted_at,

    // Hydrated relations
    course: d.course_rel?.name || '',
    university: d.university_rel?.name || '',
    counselorName: d.counselor?.name || '',
    counselorId: d.assigned_counselor,
  };
}

export function useAdmissions(options: UseAdmissionsOptions = {}) {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const {
    leadId, stage, status, universityId, courseId,
    counselorId, intake, searchTerm, dateFrom, dateTo,
    page = 1, pageSize = 50,
    enableRealtime = true,
    includeDeleted = false
  } = options;

  const fetchAdmissions = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('admissions')
        .select(`
          *,
          course_rel:courses!course_id(name),
          university_rel:universities!university_id(name),
          counselor:users!assigned_counselor(name)
        `, { count: 'exact' });

      if (!includeDeleted) query = query.is('deleted_at', null);
      if (leadId)       query = query.eq('lead_id', leadId);
      if (stage && stage !== 'All')   query = query.eq('current_stage', stage);
      if (status && status !== 'All') query = query.eq('admission_status', status);
      if (universityId) query = query.eq('university_id', universityId);
      if (courseId)     query = query.eq('course_id', courseId);
      if (counselorId)  query = query.eq('assigned_counselor', counselorId);
      if (intake)       query = query.eq('intake', intake);
      if (dateFrom)     query = query.gte('created_at', dateFrom);
      if (dateTo)       query = query.lte('created_at', dateTo);

      if (searchTerm) {
        query = query.or(
          `student_name.ilike.%${searchTerm}%,` +
          `admission_number.ilike.%${searchTerm}%,` +
          `application_number.ilike.%${searchTerm}%`
        );
      }

      query = query.order('created_at', { ascending: false });

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setAdmissions((data || []).map(mapAdmission));
      if (count !== null) setTotalCount(count);
    } catch (err: any) {
      console.error('Error fetching admissions:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, leadId, stage, status, universityId, courseId, counselorId, intake,
      searchTerm, dateFrom, dateTo, page, pageSize, includeDeleted]);

  useEffect(() => { fetchAdmissions(); }, [fetchAdmissions]);

  // Realtime subscription
  useEffect(() => {
    if (!enableRealtime || !user) return;
    const channelId = `admissions_rt_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, () => {
        fetchAdmissions();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admission_stage_history' }, () => {
        fetchAdmissions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, enableRealtime, fetchAdmissions]);

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  const addAdmission = async (admission: Partial<Admission>) => {
    try {
      const payload: any = {
        lead_id:              admission.leadId || null,
        university_id:        admission.universityId || null,
        course_id:            admission.courseId || null,
        assigned_counselor:   admission.assignedCounselor || admission.counselorId || user?.id,
        student_name:         admission.studentName,
        email:                admission.email,
        phone:                admission.phone,
        specialization:       admission.specialization,
        intake:               admission.intake,
        academic_session:     admission.academicSession,
        admission_status:     admission.admissionStatus || 'Active',
        current_stage:        admission.currentStage || admission.stage || 'Inquiry',
        progress:             admission.progress || 0,
        application_number:   admission.applicationNumber,
        university_enrollment_number: admission.universityEnrollmentNumber || admission.enrollmentNumber,
        abc_id:               admission.abcId,
        deb_id:               admission.debId,
        fee_structure:        admission.feeStructure || 0,
        scholarship_amount:   admission.scholarshipAmount || 0,
        discount:             admission.discount || 0,
        registration_date:    admission.registrationDate || null,
        admission_date:       admission.admissionDate || null,
        enrollment_date:      admission.enrollmentDate || null,
        remarks:              admission.remarks || admission.notes,
        created_by:           user?.id,
      };

      const { data, error } = await supabase
        .from('admissions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      await fetchAdmissions();
      return { success: true, data: mapAdmission(data) };
    } catch (err: any) {
      console.error('Add admission error:', err);
      return { success: false, error: err.message };
    }
  };

  const updateAdmission = async (id: string, updates: Partial<Admission>) => {
    try {
      const payload: any = { updated_by: user?.id };
      if (updates.studentName !== undefined)         payload.student_name = updates.studentName;
      if (updates.email !== undefined)               payload.email = updates.email;
      if (updates.phone !== undefined)               payload.phone = updates.phone;
      if (updates.specialization !== undefined)      payload.specialization = updates.specialization;
      if (updates.intake !== undefined)              payload.intake = updates.intake;
      if (updates.academicSession !== undefined)     payload.academic_session = updates.academicSession;
      if (updates.admissionStatus !== undefined)     payload.admission_status = updates.admissionStatus;
      if (updates.currentStage !== undefined || updates.stage !== undefined) {
        payload.current_stage = updates.currentStage || updates.stage;
      }
      if (updates.progress !== undefined)            payload.progress = updates.progress;
      if (updates.applicationNumber !== undefined)   payload.application_number = updates.applicationNumber;
      if (updates.universityEnrollmentNumber !== undefined || updates.enrollmentNumber !== undefined) {
        payload.university_enrollment_number = updates.universityEnrollmentNumber || updates.enrollmentNumber;
      }
      if (updates.abcId !== undefined)               payload.abc_id = updates.abcId;
      if (updates.debId !== undefined)               payload.deb_id = updates.debId;
      if (updates.feeStructure !== undefined)        payload.fee_structure = updates.feeStructure;
      if (updates.scholarshipAmount !== undefined)   payload.scholarship_amount = updates.scholarshipAmount;
      if (updates.discount !== undefined)            payload.discount = updates.discount;
      if (updates.registrationDate !== undefined)    payload.registration_date = updates.registrationDate;
      if (updates.admissionDate !== undefined)       payload.admission_date = updates.admissionDate;
      if (updates.enrollmentDate !== undefined)      payload.enrollment_date = updates.enrollmentDate;
      if (updates.remarks !== undefined || updates.notes !== undefined) {
        payload.remarks = updates.remarks || updates.notes;
      }
      if (updates.assignedCounselor !== undefined || updates.counselorId !== undefined) {
        payload.assigned_counselor = updates.assignedCounselor || updates.counselorId;
      }
      if (updates.universityId !== undefined)        payload.university_id = updates.universityId;
      if (updates.courseId !== undefined)            payload.course_id = updates.courseId;

      const { error } = await supabase.from('admissions').update(payload).eq('id', id);
      if (error) throw error;

      await fetchAdmissions();
      return { success: true };
    } catch (err: any) {
      console.error('Update admission error:', err);
      return { success: false, error: err.message };
    }
  };

  const changeStage = async (id: string, newStage: AdmissionStage, remarks?: string) => {
    return updateAdmission(id, { currentStage: newStage, remarks });
  };

  const cancelAdmission = async (id: string, reason?: string) => {
    return updateAdmission(id, {
      admissionStatus: 'Cancelled',
      currentStage: 'Cancelled',
      remarks: reason
    });
  };

  const restoreAdmission = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admissions')
        .update({ deleted_at: null, updated_by: user?.id })
        .eq('id', id);
      if (error) throw error;
      await fetchAdmissions();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteAdmission = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admissions')
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id })
        .eq('id', id);
      if (error) throw error;
      await fetchAdmissions();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const duplicateAdmission = async (id: string) => {
    const source = admissions.find(a => a.id === id);
    if (!source) return { success: false, error: 'Admission not found' };
    const { id: _id, admissionNumber: _num, createdAt: _c, updatedAt: _u, ...rest } = source as any;
    return addAdmission({
      ...rest,
      currentStage: 'Inquiry',
      admissionStatus: 'Active',
      progress: 0,
      applicationNumber: undefined,
      universityEnrollmentNumber: undefined,
    });
  };

  // ─── STAGE HISTORY ────────────────────────────────────────────────────────────

  const fetchStageHistory = async (admissionId: string): Promise<AdmissionStageHistory[]> => {
    const { data, error } = await supabase
      .from('admission_stage_history')
      .select('*')
      .eq('admission_id', admissionId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id,
      admissionId: d.admission_id,
      previousStage: d.previous_stage,
      newStage: d.new_stage,
      changedBy: d.changed_by,
      changedByName: d.changed_by_name,
      remarks: d.remarks,
      changedAt: d.changed_at,
    }));
  };

  // ─── NOTES ────────────────────────────────────────────────────────────────────

  const fetchNotes = async (admissionId: string): Promise<AdmissionNote[]> => {
    const { data, error } = await supabase
      .from('admission_notes')
      .select('*')
      .eq('admission_id', admissionId)
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id,
      admissionId: d.admission_id,
      content: d.content,
      authorId: d.author_id,
      authorName: d.author_name,
      isPinned: d.is_pinned,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      deletedAt: d.deleted_at,
    }));
  };

  const addNote = async (admissionId: string, content: string) => {
    const { error } = await supabase.from('admission_notes').insert({
      admission_id: admissionId,
      content,
      author_id: user?.id,
      author_name: user?.name,
    });
    if (error) throw error;
  };

  // ─── TAGS ─────────────────────────────────────────────────────────────────────

  const fetchTags = async (admissionId: string): Promise<AdmissionTag[]> => {
    const { data, error } = await supabase
      .from('admission_tags')
      .select('*')
      .eq('admission_id', admissionId);

    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id,
      admissionId: d.admission_id,
      tag: d.tag,
      createdBy: d.created_by,
      createdAt: d.created_at,
    }));
  };

  const addTag = async (admissionId: string, tag: string) => {
    const { error } = await supabase.from('admission_tags').insert({
      admission_id: admissionId,
      tag,
      created_by: user?.id,
    });
    if (error) throw error;
  };

  const removeTag = async (admissionId: string, tag: string) => {
    const { error } = await supabase
      .from('admission_tags')
      .delete()
      .eq('admission_id', admissionId)
      .eq('tag', tag);
    if (error) throw error;
  };

  return {
    admissions,
    totalCount,
    isLoading,
    error,
    refresh: fetchAdmissions,

    // CRUD
    addAdmission,
    updateAdmission,
    changeStage,
    cancelAdmission,
    restoreAdmission,
    deleteAdmission,
    duplicateAdmission,

    // History & Notes
    fetchStageHistory,
    fetchNotes,
    addNote,
    fetchTags,
    addTag,
    removeTag,
  };
}
