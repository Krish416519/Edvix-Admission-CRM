import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UniversitySubmission {
  id: string;
  idempotencyKey: string;
  admissionId: string;
  universityId: string;
  courseId: string | null;
  counselorId: string | null;
  submittedBy: string | null;
  assignedTo: string | null;
  submissionMethod: string;
  status: string;
  readinessScore: number;
  deadline: string | null;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  slaStatus: string;
  slaDueAt: string | null;
  submissionNotes: string | null;
  createdAt: string;
  // Joined
  studentName?: string;
  universityName?: string;
  courseName?: string;
  counselorName?: string;
}

export interface SubmissionReference {
  id: string;
  submissionId: string;
  refType: string;
  refValue: string;
  source: string | null;
  recordedAt: string;
}

export interface AdmissionDecision {
  id: string;
  submissionId: string;
  admissionId: string;
  decision: string;
  decisionDate: string;
  source: string | null;
  reference: string | null;
  conditions: string | null;
  notes: string | null;
  recordedBy: string;
  recordedAt: string;
  overrideReason: string | null;
}

export interface AdmissionLetter {
  id: string;
  submissionId: string;
  admissionId: string;
  letterType: string;
  storagePath: string;
  fileName: string | null;
  version: number;
  verificationStatus: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  uploadedBy: string;
  uploadedAt: string;
  isLatest: boolean;
}

export interface EnrollmentMilestone {
  id: string;
  submissionId: string;
  admissionId: string;
  milestoneName: string;
  milestoneOrder: number;
  status: string;
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
}

export interface UniversityResponse {
  id: string;
  submissionId: string | null;
  universityId: string;
  source: string;
  responseType: string | null;
  subject: string | null;
  body: string | null;
  priority: string;
  status: string;
  ownerId: string | null;
  requiredAction: string | null;
  actionDeadline: string | null;
  receivedAt: string;
  universityName?: string;
}

export interface UniversitySLA {
  id: string;
  universityId: string | null;
  eventType: string;
  slaHours: number;
  isActive: boolean;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapSubmission(row: any): UniversitySubmission {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    admissionId: row.admission_id,
    universityId: row.university_id,
    courseId: row.course_id,
    counselorId: row.counselor_id,
    submittedBy: row.submitted_by,
    assignedTo: row.assigned_to,
    submissionMethod: row.submission_method,
    status: row.status,
    readinessScore: row.readiness_score ?? 0,
    deadline: row.deadline,
    submittedAt: row.submitted_at,
    acknowledgedAt: row.acknowledged_at,
    slaStatus: row.sla_status,
    slaDueAt: row.sla_due_at,
    submissionNotes: row.submission_notes,
    createdAt: row.created_at,
    studentName: row.admission?.student_name,
    universityName: row.university?.name,
    courseName: row.course_rel?.name,
    counselorName: row.counselor?.name,
  };
}

// ─── Idempotency Key Generator ────────────────────────────────────────────────

export function buildIdempotencyKey(admissionId: string, universityId: string, courseId?: string): string {
  return `${admissionId}::${universityId}::${courseId ?? 'none'}`;
}

// ─── useSubmissionQueue ───────────────────────────────────────────────────────

export function useSubmissionQueue(filters?: {
  status?: string;
  universityId?: string;
  counselorId?: string;
}) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<UniversitySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchQueue = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      let query = supabase
        .from('university_submissions')
        .select(`
          *,
          admission:admissions!admission_id(student_name),
          university:universities!university_id(name),
          course_rel:courses!course_id(name),
          counselor:users!counselor_id(name)
        `, { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'All') {
        query = query.eq('status', filters.status);
      }
      if (filters?.universityId) {
        query = query.eq('university_id', filters.universityId);
      }
      if (filters?.counselorId) {
        query = query.eq('counselor_id', filters.counselorId);
      }

      const { data, error, count } = await query.limit(100);
      if (error) throw error;
      setSubmissions((data || []).map(mapSubmission));
      if (count !== null) setTotalCount(count);
    } catch (err: any) {
      console.error('[useSubmissionQueue]', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters?.status, filters?.universityId, filters?.counselorId]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Real-time
  useEffect(() => {
    if (!user) return;
    const channelId = `uni_submissions_rt_${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'university_submissions' }, fetchQueue)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchQueue]);

  return { submissions, isLoading, totalCount, refetch: fetchQueue };
}

// ─── useSubmissionReadiness ───────────────────────────────────────────────────

export interface ReadinessCheck {
  passed: boolean;
  score: number;
  blockers: string[];
  checks: { label: string; passed: boolean; detail?: string }[];
}

export function useSubmissionReadiness(admissionId: string | null): ReadinessCheck {
  // In production: query documents, payments, admission fields
  // Here we compute from joined data
  const [readiness, setReadiness] = useState<ReadinessCheck>({
    passed: false, score: 0, blockers: [], checks: [],
  });

  useEffect(() => {
    if (!admissionId) return;
    (async () => {
      try {
        const { data: admission } = await supabase
          .from('admissions')
          .select('*, documents:documents(status, is_mandatory)')
          .eq('id', admissionId)
          .single();

        if (!admission) return;

        const checks: ReadinessCheck['checks'] = [];
        const blockers: string[] = [];

        // Check 1: Student name filled
        const hasStudentInfo = !!admission.student_name && !!admission.email;
        checks.push({ label: 'Student information complete', passed: hasStudentInfo,
          detail: hasStudentInfo ? undefined : 'Name and email are required' });
        if (!hasStudentInfo) blockers.push('Student information incomplete');

        // Check 2: University assigned
        const hasUniversity = !!admission.university_id;
        checks.push({ label: 'University assigned', passed: hasUniversity });
        if (!hasUniversity) blockers.push('No university assigned');

        // Check 3: Course assigned
        const hasCourse = !!admission.course_id;
        checks.push({ label: 'Program assigned', passed: hasCourse });
        if (!hasCourse) blockers.push('No program assigned');

        // Check 4: Mandatory docs approved
        const mandatoryDocs = (admission.documents || []).filter((d: any) => d.is_mandatory);
        const allDocsApproved = mandatoryDocs.length > 0 && mandatoryDocs.every((d: any) => d.status === 'Approved');
        const docsLabel = mandatoryDocs.length === 0
          ? 'No mandatory documents required'
          : `${mandatoryDocs.filter((d: any) => d.status === 'Approved').length}/${mandatoryDocs.length} mandatory documents approved`;
        checks.push({ label: 'Required documents approved', passed: allDocsApproved || mandatoryDocs.length === 0,
          detail: docsLabel });
        if (!allDocsApproved && mandatoryDocs.length > 0) blockers.push('Not all mandatory documents are approved');

        const passed = blockers.length === 0;
        const score = Math.round((checks.filter(c => c.passed).length / checks.length) * 100);
        setReadiness({ passed, score, blockers, checks });
      } catch (err) {
        console.error('[useSubmissionReadiness]', err);
      }
    })();
  }, [admissionId]);

  return readiness;
}

// ─── useSubmitToUniversity ────────────────────────────────────────────────────

export function useUniversityOpsActions() {
  const { user } = useAuth();

  const submitToUniversity = async (params: {
    admissionId: string;
    universityId: string;
    courseId?: string;
    method: string;
    notes?: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    const idempotencyKey = buildIdempotencyKey(params.admissionId, params.universityId, params.courseId);

    // Check idempotency — prevent duplicate submissions
    const { data: existing } = await supabase
      .from('university_submissions')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing) {
      throw new Error(`Application already submitted (Status: ${existing.status}). Duplicate submissions are blocked.`);
    }

    const { data, error } = await supabase
      .from('university_submissions')
      .insert({
        idempotency_key: idempotencyKey,
        admission_id: params.admissionId,
        university_id: params.universityId,
        course_id: params.courseId ?? null,
        submission_method: params.method,
        status: 'Submitted',
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
        submission_notes: params.notes ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const recordReference = async (submissionId: string, refType: string, refValue: string, source?: string) => {
    const { error } = await supabase
      .from('university_submission_references')
      .insert({ submission_id: submissionId, ref_type: refType, ref_value: refValue, source: source ?? null, recorded_by: user?.id });
    if (error) throw error;
  };

  const updateSubmissionStatus = async (submissionId: string, newStatus: string, notes?: string) => {
    const { error } = await supabase
      .from('university_submissions')
      .update({ status: newStatus, updated_by: user?.id })
      .eq('id', submissionId);
    if (error) throw error;
  };

  const recordDecision = async (params: {
    submissionId: string;
    admissionId: string;
    decision: string;
    decisionDate: string;
    source?: string;
    reference?: string;
    conditions?: string;
    notes?: string;
    organizationId?: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('admission_decisions')
      .insert({
        submission_id: params.submissionId,
        admission_id: params.admissionId,
        organization_id: params.organizationId ?? null,
        decision: params.decision,
        decision_date: params.decisionDate,
        source: params.source ?? 'Manual',
        reference: params.reference ?? null,
        conditions: params.conditions ?? null,
        notes: params.notes ?? null,
        recorded_by: user.id,
      })
      .select()
      .single();
    if (error) throw error;
    // Also update submission status
    const statusMap: Record<string, string> = {
      'Approved': 'Approved', 'Conditionally Approved': 'Conditional Approval',
      'Rejected': 'Rejected', 'Waitlisted': 'Waitlisted', 'Deferred': 'Deferred', 'Withdrawn': 'Withdrawn',
    };
    if (statusMap[params.decision]) {
      await updateSubmissionStatus(params.submissionId, statusMap[params.decision]);
    }
    return data;
  };

  const completeMilestone = async (milestoneId: string) => {
    const { error } = await supabase
      .from('enrollment_milestones')
      .update({ status: 'Completed', completed_at: new Date().toISOString(), completed_by: user?.id })
      .eq('id', milestoneId);
    if (error) throw error;
  };

  return { submitToUniversity, recordReference, updateSubmissionStatus, recordDecision, completeMilestone };
}

// ─── useUniversityResponses ───────────────────────────────────────────────────

export function useUniversityResponses(universityId?: string) {
  const { user } = useAuth();
  const [responses, setResponses] = useState<UniversityResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      let q = supabase
        .from('university_responses')
        .select('*, university:universities!university_id(name)')
        .order('received_at', { ascending: false })
        .limit(100);
      if (universityId) q = q.eq('university_id', universityId);

      const { data, error } = await q;
      if (error) throw error;
      setResponses((data || []).map((r: any) => ({
        id: r.id, submissionId: r.submission_id, universityId: r.university_id,
        source: r.source, responseType: r.response_type, subject: r.subject,
        body: r.body, priority: r.priority, status: r.status, ownerId: r.owner_id,
        requiredAction: r.required_action, actionDeadline: r.action_deadline,
        receivedAt: r.received_at, universityName: r.university?.name,
      })));
    } finally {
      setIsLoading(false);
    }
  }, [user, universityId]);

  useEffect(() => { fetch(); }, [fetch]);

  const markActioned = async (id: string) => {
    await supabase.from('university_responses')
      .update({ status: 'Actioned', actioned_at: new Date().toISOString(), actioned_by: user?.id })
      .eq('id', id);
    fetch();
  };

  const addResponse = async (params: Partial<UniversityResponse> & { organizationId?: string }) => {
    const { error } = await supabase.from('university_responses').insert({
      submission_id: params.submissionId ?? null,
      university_id: params.universityId,
      organization_id: params.organizationId ?? null,
      source: params.source ?? 'Manual',
      response_type: params.responseType ?? null,
      subject: params.subject ?? null,
      body: params.body ?? null,
      priority: params.priority ?? 'Normal',
      status: 'Unread',
      required_action: params.requiredAction ?? null,
      action_deadline: params.actionDeadline ?? null,
    });
    if (error) throw error;
    fetch();
  };

  return { responses, isLoading, refetch: fetch, markActioned, addResponse };
}

// ─── useSLAs ──────────────────────────────────────────────────────────────────

export function useSLAs(universityId?: string) {
  const { user } = useAuth();
  const [slas, setSLAs] = useState<UniversitySLA[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('university_slas')
        .select('*')
        .or(`university_id.is.null${universityId ? `,university_id.eq.${universityId}` : ''}`)
        .eq('is_active', true);
      setSLAs((data || []).map((r: any) => ({
        id: r.id, universityId: r.university_id, eventType: r.event_type,
        slaHours: r.sla_hours, isActive: r.is_active,
      })));
      setIsLoading(false);
    })();
  }, [user, universityId]);

  return { slas, isLoading };
}

// ─── useEnrollmentMilestones ──────────────────────────────────────────────────

const DEFAULT_MILESTONES = [
  'Admission Confirmed', 'Fee Paid', 'Enrollment Initiated',
  'Enrollment Confirmed', 'Student ID Received', 'LMS Access', 'Orientation',
];

export function useEnrollmentMilestones(submissionId: string | null, admissionId: string | null) {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<EnrollmentMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!submissionId || !admissionId) { setIsLoading(false); return; }
    const { data } = await supabase
      .from('enrollment_milestones')
      .select('*')
      .eq('submission_id', submissionId)
      .order('milestone_order');
    if (data && data.length > 0) {
      setMilestones(data.map((r: any) => ({
        id: r.id, submissionId: r.submission_id, admissionId: r.admission_id,
        milestoneName: r.milestone_name, milestoneOrder: r.milestone_order,
        status: r.status, completedAt: r.completed_at, completedBy: r.completed_by, notes: r.notes,
      })));
    } else {
      // Seed default milestones
      const inserts = DEFAULT_MILESTONES.map((name, i) => ({
        submission_id: submissionId, admission_id: admissionId,
        milestone_name: name, milestone_order: i + 1, status: 'Pending',
      }));
      await supabase.from('enrollment_milestones').insert(inserts);
      fetch();
    }
    setIsLoading(false);
  }, [submissionId, admissionId]);

  useEffect(() => { fetch(); }, [fetch]);

  const completeMilestone = async (milestoneId: string, notes?: string) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('enrollment_milestones')
      .update({
        status: 'Completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        notes: notes || null,
      })
      .eq('id', milestoneId);
    if (error) throw error;
    await fetch();
  };

  return { milestones, isLoading, refetch: fetch, completeMilestone };
}

// ─── useAdmissionLetters ──────────────────────────────────────────────────────

export function useAdmissionLetters(submissionId: string | null) {
  const { user } = useAuth();
  const [letters, setLetters] = useState<AdmissionLetter[]>([]);

  const fetch = useCallback(async () => {
    if (!submissionId) return;
    const { data } = await supabase
      .from('admission_letters')
      .select('*')
      .eq('submission_id', submissionId)
      .order('uploaded_at', { ascending: false });
    setLetters((data || []).map((r: any) => ({
      id: r.id, submissionId: r.submission_id, admissionId: r.admission_id,
      letterType: r.letter_type, storagePath: r.storage_path, fileName: r.file_name,
      version: r.version, verificationStatus: r.verification_status,
      verifiedBy: r.verified_by, verifiedAt: r.verified_at, rejectionReason: r.rejection_reason,
      uploadedBy: r.uploaded_by, uploadedAt: r.uploaded_at, isLatest: r.is_latest,
    })));
  }, [submissionId]);

  useEffect(() => { fetch(); }, [fetch]);

  const uploadLetter = async (params: {
    submissionId: string; admissionId: string; letterType: string;
    file: File; organizationId?: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    const path = `admission-letters/${params.admissionId}/${Date.now()}_${params.file.name}`;
    const { error: uploadErr } = await supabase.storage.from('documents').upload(path, params.file);
    if (uploadErr) throw uploadErr;
    // Mark older letters as not latest
    await supabase.from('admission_letters')
      .update({ is_latest: false })
      .eq('submission_id', params.submissionId)
      .eq('letter_type', params.letterType);
    const { error } = await supabase.from('admission_letters').insert({
      submission_id: params.submissionId,
      admission_id: params.admissionId,
      organization_id: params.organizationId ?? null,
      letter_type: params.letterType,
      storage_path: path,
      file_name: params.file.name,
      file_size_bytes: params.file.size,
      uploaded_by: user.id,
      is_latest: true,
    });
    if (error) throw error;
    fetch();
    toast.success('Admission letter uploaded successfully');
  };

  const updateVerification = async (letterId: string, status: string, reason?: string) => {
    await supabase.from('admission_letters').update({
      verification_status: status,
      verified_by: user?.id,
      verified_at: new Date().toISOString(),
      rejection_reason: reason ?? null,
    }).eq('id', letterId);
    fetch();
  };

  return { letters, uploadLetter, updateVerification, refetch: fetch };
}
